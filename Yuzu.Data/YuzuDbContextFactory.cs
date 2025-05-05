using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;
using System.Reflection;

namespace Yuzu.Data
{
    /// <summary>
    /// Factory for creating YuzuDbContext instances
    /// This is used by EF Core tools for migrations and at runtime
    /// </summary>
    public class YuzuDbContextFactory : IDesignTimeDbContextFactory<YuzuDbContext>
    {
        /// <summary>
        /// Creates a new instance of YuzuDbContext
        /// </summary>
        /// <param name="args">Command-line arguments</param>
        /// <returns>A new instance of YuzuDbContext</returns>
        public YuzuDbContext CreateDbContext(string[] args)
        {
            // Load configuration from appsettings.json
            IConfigurationRoot configuration = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
                .AddJsonFile($"appsettings.{Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production"}.json", optional: true)
                .AddEnvironmentVariables()
                .Build();

            // Get connection string
            var connectionString = configuration.GetConnectionString("DefaultConnection");
            
            if (string.IsNullOrEmpty(connectionString))
            {
                connectionString = configuration.GetSection("DataStorageConfig")["ConnectionString"];
            }
            
            if (string.IsNullOrEmpty(connectionString))
            {
                throw new InvalidOperationException("Could not find a connection string. Ensure that either ConnectionStrings:DefaultConnection or DataStorageConfig:ConnectionString is set in appsettings.json.");
            }

            // Create DbContext options
            var optionsBuilder = new DbContextOptionsBuilder<YuzuDbContext>();
            optionsBuilder.UseNpgsql(connectionString);

            return new YuzuDbContext(optionsBuilder.Options, configuration);
        }
    }
}