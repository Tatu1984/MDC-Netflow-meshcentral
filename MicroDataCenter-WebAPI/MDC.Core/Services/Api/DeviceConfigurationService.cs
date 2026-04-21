using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MDC.Core.Services.Api;

internal class DeviceConfigurationService : IDeviceConfigurationService
{
    public Task<DeviceConfiguration> CreateAsync(DeviceConfiguration deviceConfiguration)
    {
        throw new NotImplementedException();
    }

    public Task DeleteAsync(Guid id)
    {
        throw new NotImplementedException();
    }

    public Task<IEnumerable<DeviceConfiguration>> GetAllAsync()
    {
        throw new NotImplementedException();
    }

    public Task<DeviceConfiguration?> GetByAddressAsync(string address)
    {
        throw new NotImplementedException();
    }

    public Task<DeviceConfiguration?> GetByIdAsync(Guid id)
    {
        throw new NotImplementedException();
    }

    public Task<DeviceConfiguration> UpdateAsync(DeviceConfiguration deviceConfiguration)
    {
        throw new NotImplementedException();
    }
}
