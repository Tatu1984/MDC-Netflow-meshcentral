using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;

namespace MDC.Core.Services.Providers.ZeroTier
{
    internal class ZeroTierAuthHandler(IZeroTierTokenProvider tokenProvider) : DelegatingHandler
    {
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            var token = await tokenProvider.GetTokenAsync(ct);
            request.Headers.Authorization = new AuthenticationHeaderValue("token", token);

            return await base.SendAsync(request, ct);
        }
    }
}
