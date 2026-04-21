using Microsoft.Extensions.Caching.Memory;

namespace MDC.Core.Services.Providers.ProxmoxDatacenterManager;

/// <summary>
/// Short-TTL read-through cache in front of <see cref="IPdmClient"/>.
/// Collapses concurrent identical requests into one upstream call (single-flight per key).
/// </summary>
public sealed class PdmTelemetryCache
{
    private readonly IMemoryCache _cache;
    private readonly Dictionary<string, Task> _inflight = new();
    private readonly object _gate = new();

    /// <summary>Create a new cache backed by the supplied in-memory cache.</summary>
    public PdmTelemetryCache(IMemoryCache cache)
    {
        _cache = cache;
    }

    /// <summary>
    /// Return the cached value for <paramref name="key"/>, invoking <paramref name="loader"/> on miss.
    /// Concurrent misses collapse into a single upstream call.
    /// </summary>
    public async Task<T> GetOrFetchAsync<T>(string key, TimeSpan ttl, Func<Task<T>> loader)
    {
        if (_cache.TryGetValue(key, out T? cached) && cached is not null)
        {
            return cached;
        }

        Task<T> work;
        lock (_gate)
        {
            if (_inflight.TryGetValue(key, out var existing))
            {
                work = (Task<T>)existing;
            }
            else
            {
                work = FetchAndStore(key, ttl, loader);
                _inflight[key] = work;
            }
        }
        try
        {
            return await work.ConfigureAwait(false);
        }
        finally
        {
            lock (_gate) { _inflight.Remove(key); }
        }
    }

    private async Task<T> FetchAndStore<T>(string key, TimeSpan ttl, Func<Task<T>> loader)
    {
        var value = await loader().ConfigureAwait(false);
        _cache.Set(key, value, ttl);
        return value;
    }
}
