using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace MDC.Core.Services.Providers.MDCDatabase;

/*
 * When modifying database schema, be sure to add a new migration using the following command in Package Manager Console: 
 *  add-migration <Migration Name> -Project "MDC.Core"
 * 
 */

internal class DatabaseMigrationService(MDCDbContext context, ILogger<DatabaseMigrationService> logger) : IDatabaseMigrationService
{
    public async Task<bool> MigrateAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            logger.LogInformation("Starting database migration...");
            
            var pendingMigrations = await context.Database.GetPendingMigrationsAsync(cancellationToken);
            if (pendingMigrations.Any())
            {
                logger.LogInformation("Found {Count} pending migrations: {Migrations}", 
                    pendingMigrations.Count(), string.Join(", ", pendingMigrations));

                await context.Database.MigrateAsync(cancellationToken);

                logger.LogInformation("Database migration completed successfully");
                return true; // Migrations were applied
            }
            else
            {
                logger.LogInformation("Database is already up to date");
                return false; // No migrations were applied
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to migrate database");
            throw;
        }
    }
    
    public async Task<IEnumerable<string>> GetPendingMigrationsAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            return await context.Database.GetPendingMigrationsAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to get pending migrations");
            throw;
        }
    }
    
    public async Task<bool> IsNewDatabaseAsync(CancellationToken cancellationToken)
    {
        try
        {
            // Check if the database exists and has any applied migrations
            var appliedMigrations = await context.Database.GetAppliedMigrationsAsync(cancellationToken);
            return !appliedMigrations.Any();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to check if database is new");
            throw;
        }
    }
}