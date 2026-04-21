using MDC.Core.Services.Providers.PVEClient;
using MDC.Core.Services.Providers.ZeroTier;
using System.Net;

namespace MDC.Core.Services.Providers.MDCEndpoint;

internal class MicroDataCenterEndpoint
{
    public required TokenPVEClientServiceOptions PVEClientConfiguration;

    public required IPAddress[] IPAddresses;

    public required ZTMember ZTMember;

    //public IPVEClientService CreatePVEClient()
    //{
    //    if (PVEClientConfiguration == null)
    //    {
    //        throw new InvalidOperationException($"PVE Client Configuration is not set for MicroDataCenter endpoint.");
    //    }
    //    return PVEClientConfiguration._CreatePVEClient();
    //}

}
