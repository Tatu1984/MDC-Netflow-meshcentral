using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;

namespace MDC.Api;

internal class GlobalExceptionHandler : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        // Set standard OData error response
        httpContext.Response.StatusCode = StatusCodes.Status500InternalServerError;
        httpContext.Response.ContentType = "application/json";

        // Create OData error format
        var errorResponse = new
        {
            error = new
            {
                code = "InternalError",
                message = exception.Message
            }
        };

        await httpContext.Response.WriteAsJsonAsync(errorResponse, cancellationToken);
        return true; // Mark as handled
    }
}
