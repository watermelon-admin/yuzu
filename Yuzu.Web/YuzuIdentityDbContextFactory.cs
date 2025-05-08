using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;
using System.Reflection;

namespace Yuzu.Web
{
    /// <summary>
    /// Factory for creating YuzuIdentityDbContext instances at design time for migrations
    /// </summary>
    public class YuzuIdentityDbContextFactory : IDesignTimeDbContextFactory<YuzuIdentityDbContext>
    {
        /// <summary>
        /// Creates a new YuzuIdentityDbContext instance at design time
        /// </summary>
        /// <param name="args">Command line arguments</param>
        /// <returns>A new YuzuIdentityDbContext instance</returns>
        public YuzuIdentityDbContext CreateDbContext(string[] args)
        {
            // Create configuration
            var configuration = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("appsettings.json", optional: false)
                .AddJsonFile($"appsettings.{Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production"}.json", optional: true)
                .AddEnvironmentVariables()
                .AddUserSecrets<YuzuIdentityDbContext>(optional: true)
                .Build();

            // Get connection string from configuration
            var connectionString = configuration.GetConnectionString("DefaultConnection");
            
            if (string.IsNullOrEmpty(connectionString))
            {
                throw new InvalidOperationException("Could not find a connection string. Ensure that ConnectionStrings:DefaultConnection is set in appsettings.json or user secrets.");
            }

            // Configure DbContext options
            var optionsBuilder = new DbContextOptionsBuilder<YuzuIdentityDbContext>();
            optionsBuilder.UseNpgsql(connectionString, options =>
            {
                // Configure migrations assembly
                options.MigrationsAssembly(typeof(YuzuIdentityDbContext).Assembly.GetName().Name);
            });

            // Create and return the DbContext
            return new YuzuIdentityDbContext(optionsBuilder.Options);
        }
    }
}