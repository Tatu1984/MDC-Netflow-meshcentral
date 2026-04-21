using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace MDC.Core.Services.Providers.PVEClient;

internal class PVEResponse<T>
{
    [JsonPropertyName("data")]
    public T? Data { get; set; }

    public string? Error { get; set; }
    public int? StatusCode { get; set; }
    public bool IsSuccess => StatusCode >= 200 && StatusCode < 300;
    public string? Changes { get; set; }

    //public PVEResponse(T data, int statusCode)
    //{
    //    Data = data;
    //    StatusCode = statusCode;
    //    Error = null;
    //}
    //public PVEResponse(string error, int statusCode)
    //{
    //    Error = error;
    //    StatusCode = statusCode;
    //    Data = default;
    //}
}
