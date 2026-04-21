using System.Collections.Generic;
using System.Threading.Tasks;

namespace MDC.Core.Services.Providers.MDCDatabase
{
    /// <summary>
    /// Service for managing Entity Framework database migrations
    /// </summary>
    public interface IDatabaseMigrationService
    {
        /// <summary>
        /// Applies all pending database migrations
        /// </summary>
        /// <returns>True if migrations were applied, false if database was already up to date</returns>
        Task<bool> MigrateAsync(CancellationToken cancellationToken = default);
        
        /// <summary>
        /// Gets pending database migrations without applying them
        /// </summary>
        /// <returns>List of pending migration names</returns>
        Task<IEnumerable<string>> GetPendingMigrationsAsync(CancellationToken cancellationToken = default);
        
        /// <summary>
        /// Checks if the database is new (no migrations have been applied yet)
        /// </summary>
        /// <returns>True if this is a new database, false otherwise</returns>
        Task<bool> IsNewDatabaseAsync(CancellationToken cancellationToken = default);
    }
}