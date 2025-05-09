using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Yuzu.Data
{
    /// <summary>
    /// Database initializer for the Yuzu application
    /// </summary>
    public class DbInitializer
    {
        private readonly YuzuDbContext _dbContext;
        private readonly ILogger<DbInitializer> _logger;
        
        /// <summary>
        /// Initializes a new instance of the DbInitializer class
        /// </summary>
        /// <param name="dbContext">The database context</param>
        /// <param name="logger">The logger</param>
        public DbInitializer(YuzuDbContext dbContext, ILogger<DbInitializer> logger)
        {
            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }
        
        /// <summary>
        /// Checks if database is accessible
        /// </summary>
        public async Task<bool> CheckDatabaseAccessAsync()
        {
            try
            {
                // Just verify connection without excessive logging
                bool canConnect = await _dbContext.Database.CanConnectAsync();
                return canConnect;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while checking database connectivity");
                return false;
            }
        }
    }
}