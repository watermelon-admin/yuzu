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
            // Create configuration builder
            var configBuilder = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("appsettings.json", optional: false)
                .AddJsonFile($"appsettings.{Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production"}.json", optional: true);
            
            // Add environment variables to configuration
            configBuilder.AddEnvironmentVariables();
            
            // Add user secrets
            configBuilder.AddUserSecrets<YuzuIdentityDbContext>(optional: true);
            
            // Add Kubernetes secrets if running in Kubernetes
            bool isRunningInKubernetes = IsRunningInKubernetes();
            if (isRunningInKubernetes)
            {
                Console.WriteLine("Kubernetes environment detected. Connection strings and secrets will be loaded from Kubernetes secrets.");
                
                // In Kubernetes, secrets will be available as environment variables
                // injected into the pod, and they will be picked up by the .AddEnvironmentVariables() call above.
                
                // We could also add Kubernetes secrets provider, but we can't reference it directly
                // from here without creating a circular dependency. For migrations, environment variables
                // are sufficient.
            }
            
            // Build the configuration
            var configuration = configBuilder.Build();

            // Get connection string from configuration
            var connectionString = configuration.GetConnectionString("DefaultConnection");
            
            if (string.IsNullOrEmpty(connectionString))
            {
                throw new InvalidOperationException("Could not find a connection string. Ensure that ConnectionStrings:DefaultConnection is set in appsettings.json, user secrets, or Kubernetes secrets.");
            }

            Console.WriteLine($"Connection string found. Using database: {GetDatabaseName(connectionString)}");

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
        
        /// <summary>
        /// Extracts the database name from a Postgres connection string
        /// </summary>
        private string GetDatabaseName(string connectionString)
        {
            try
            {
                var builder = new Npgsql.NpgsqlConnectionStringBuilder(connectionString);
                return builder.Database ?? "unknown";
            }
            catch
            {
                return "unknown";
            }
        }
        
        /// <summary>
        /// Detects if the application is running in a Kubernetes environment
        /// </summary>
        private bool IsRunningInKubernetes()
        {
            // Check for the standard Kubernetes service host environment variable
            if (!string.IsNullOrEmpty(Environment.GetEnvironmentVariable("KUBERNETES_SERVICE_HOST")))
            {
                return true;
            }
            
            // Check for the existence of the Kubernetes service account token file
            if (File.Exists("/var/run/secrets/kubernetes.io/serviceaccount/token"))
            {
                return true;
            }
            
            return false;
        }
    }
}