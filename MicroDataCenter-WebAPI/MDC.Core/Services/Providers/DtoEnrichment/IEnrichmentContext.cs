namespace MDC.Core.Services.Providers.DtoEnrichment;

internal interface IEnrichmentContext
{
    AsyncLazy<T> GetOrAdd<T>(string key, Func<CancellationToken, Task<T>> factory);
}
