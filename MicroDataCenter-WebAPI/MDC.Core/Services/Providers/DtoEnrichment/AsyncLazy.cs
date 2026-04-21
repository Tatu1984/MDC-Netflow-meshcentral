namespace MDC.Core.Services.Providers.DtoEnrichment;

internal sealed class AsyncLazy<T>
{
    private readonly object _lock = new();
    private readonly Func<CancellationToken, Task<T>> _factory;
    private Task<T>? _task;

    public AsyncLazy(Func<CancellationToken, Task<T>> factory)
    {
        _factory = factory ?? throw new ArgumentNullException(nameof(factory));
    }

    public Task<T> GetValueAsync(CancellationToken ct = default)
    {
        if (_task != null) return _task;

        lock (_lock)
        {
            if (_task == null)
            {
                _task = _factory(ct);
            }
        }

        return _task;
    }
}
