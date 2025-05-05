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
        /// Ensures the database is created and ready to use
        /// </summary>
        public async Task EnsureDatabaseCreatedAsync()
        {
            try
            {
                _logger.LogInformation("Ensuring database is created using EnsureCreated...");
                
                // Use EnsureCreated instead of Migrate to avoid migration issues
                await _dbContext.Database.EnsureCreatedAsync();
                
                _logger.LogInformation("Database creation complete");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while initializing the database");
                throw;
            }
        }
    }
}