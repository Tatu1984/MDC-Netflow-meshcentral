using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MDC.Core.Services.Api;

/// <summary>
/// 
/// </summary>
public interface IDeviceConfigurationService
{
    /// <summary>
    /// 
    /// </summary>
    /// <returns></returns>
    Task<IEnumerable<DeviceConfiguration>> GetAllAsync();
    /// <summary>
    /// 
    /// </summary>
    /// <param name="id"></param>
    /// <returns></returns>
    Task<DeviceConfiguration?> GetByIdAsync(Guid id);
    /// <summary>
    /// 
    /// </summary>
    /// <param name="address"></param>
    /// <returns></returns>
    Task<DeviceConfiguration?> GetByAddressAsync(string address);
    /// <summary>
    /// 
    /// </summary>
    /// <param name="deviceConfiguration"></param>
    /// <returns></returns>
    Task<DeviceConfiguration> CreateAsync(DeviceConfiguration deviceConfiguration);
    /// <summary>
    /// 
    /// </summary>
    /// <param name="deviceConfiguration"></param>
    /// <returns></returns>
    Task<DeviceConfiguration> UpdateAsync(DeviceConfiguration deviceConfiguration);
    /// <summary>
    /// 
    /// </summary>
    /// <param name="id"></param>
    Task DeleteAsync(Guid id);
}
