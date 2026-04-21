using MDC.Core.Services.Providers.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using System.Text.Json;

namespace MDC.Core.Services.Providers.MDCDatabase;

internal class AuditInterceptor(ITenantContext tenantContext) : SaveChangesInterceptor
{
    public async override ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
    {
        if (tenantContext.ObjectId == null)
            throw new InvalidOperationException("Unable to save database changes. No user context");

        var context = eventData.Context;

        if (context != null)
        {
            var logs = new List<DbActivityLog>();
            foreach (var entry in context.ChangeTracker.Entries())
            {
                // Don't add audit records during AutoInstallating a device becuase the authorized identity is temporary and there is User for the ActivityLog FK constraint
                // Only the DbSiteNodeRegistration table can be modified by this temporary identity
                if (tenantContext.IsDeviceRegistration)
                {
                    Type[] allowedTypes = { typeof(DbSiteNodeRegistration), typeof(DbSiteNode), typeof(DbSite) };
                    if (!allowedTypes.Contains(entry.Metadata.ClrType))
                        throw new InvalidOperationException("Auto Installation is not authorized to perform this operation.");
                    continue;
                }

                switch (entry.State)
                {
                    case EntityState.Added:
                        {
                            // When a User is creating itself in the Users table, use the SavedChangesAsync instead of SavingChangesAsync method
                            if (entry.Metadata.ClrType == typeof (DbUser) && (Guid?)entry.Properties.FirstOrDefault(i => i.Metadata.Name == "Id")?.CurrentValue == tenantContext.ObjectId.Value)
                            {
                                break;
                            }

                            var changes = entry.Properties
                                .ToDictionary(
                                    p => p.Metadata.Name,
                                    p => new
                                    {
                                        New = p.CurrentValue
                                    });

                            logs.Add(new DbActivityLog
                            {
                                EntityName = entry.Metadata.Name.Split('.').Last(),
                                //EntityId = (Guid)entry.Property("Id").CurrentValue!,
                                EntityId = (Guid?)entry.Properties.FirstOrDefault(i => i.Metadata.Name == "Id")?.CurrentValue,
                                Action = entry.State.ToString(),
                                ChangesJson = JsonSerializer.Serialize(changes),
                                UserId = tenantContext.ObjectId.Value,
                                TimestampUtc = DateTime.UtcNow
                            });

                            break;
                        }
                    case EntityState.Modified:
                        {
                            var changes = entry.Properties
                                .Where(p => p.IsModified)
                                .ToDictionary(
                                    p => p.Metadata.Name,
                                    p => new
                                    {
                                        Old = entry.OriginalValues[p.Metadata.Name],
                                        New = p.CurrentValue
                                    });

                            logs.Add(new DbActivityLog
                            {
                                EntityName = entry.Entity.GetType().Name,
                                EntityId = (Guid)entry.Property("Id").CurrentValue!,
                                Action = entry.State.ToString(),
                                ChangesJson = JsonSerializer.Serialize(changes),
                                UserId = tenantContext.ObjectId.Value,
                                TimestampUtc = DateTime.UtcNow
                            });
                            break;
                        }
                    case EntityState.Deleted:
                        {
                            // We might throw an exception when entities are deleted;  All entities should have Soft-Delete so that related ActivityLog is not lost
                            break;
                        }
                }
            }

            if (logs.Any())
            {
                // Check that the current user exists and is active, or else changes cannot be saved
                var user = await context.Set<DbUser>().FindAsync([tenantContext.ObjectId], cancellationToken);
                if (user == null || user.Active == false)
                    throw new UnauthorizedAccessException("Identity is not Authorized to perform this operation.");
                await context.Set<DbActivityLog>().AddRangeAsync(logs, cancellationToken);
            }
        }

        return await base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
    {
        throw new NotImplementedException("Save Changes to database must be Async");
        // return base.SavingChanges(eventData, result);
    }
}
