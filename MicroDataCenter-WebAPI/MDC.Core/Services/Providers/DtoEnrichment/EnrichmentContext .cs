using System.Collections.Concurrent;

namespace MDC.Core.Services.Providers.DtoEnrichment;

internal class EnrichmentContext : IEnrichmentContext
{
    private readonly ConcurrentDictionary<string, object> _cache = new();

    public AsyncLazy<T> GetOrAdd<T>(string key, Func<CancellationToken, Task<T>> factory)
    {
        var lazy = (AsyncLazy<T>)_cache.GetOrAdd(
            key,
            _ => new AsyncLazy<T>(factory)
        );

        return lazy;
    }
}
