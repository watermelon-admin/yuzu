using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
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
            // Find the path to the Yuzu.Web project
            var currentDirectory = Directory.GetCurrentDirectory();
            string webProjectPath = Path.Combine(Directory.GetParent(currentDirectory)!.FullName, "Yuzu.Web");
            
            // If we're already in the Yuzu.Web directory or a different location, try to find the solution root
            if (!Directory.Exists(webProjectPath))
            {
                // Try to find solution root by going up one level if needed
                var parentDirectory = Directory.GetParent(currentDirectory);
                if (parentDirectory != null)
                {
                    webProjectPath = Path.Combine(parentDirectory.FullName, "Yuzu.Web");
                }
            }
            
            // If we still can't find it, try one more level up
            if (!Directory.Exists(webProjectPath))
            {
                var grandParentDirectory = Directory.GetParent(Directory.GetParent(currentDirectory)!.FullName);
                if (grandParentDirectory != null)
                {
                    webProjectPath = Path.Combine(grandParentDirectory.FullName, "Yuzu.Web");
                }
            }
            
            // Fall back to current directory if we can't find the web project
            if (!Directory.Exists(webProjectPath))
            {
                webProjectPath = currentDirectory;
                Console.WriteLine("Warning: Could not locate Yuzu.Web directory. Using current directory for configuration.");
            }
            else
            {
                Console.WriteLine($"Using configuration from: {webProjectPath}");
            }

            // Load configuration from Web project's appsettings.json if found, otherwise use local
            IConfigurationBuilder configBuilder = new ConfigurationBuilder()
                .SetBasePath(webProjectPath)
                .AddJsonFile("appsettings.json", optional: true)
                .AddJsonFile($"appsettings.{Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production"}.json", optional: true);
                
            // If Web project appsettings not found, fall back to local directory
            if (!File.Exists(Path.Combine(webProjectPath, "appsettings.json")))
            {
                Console.WriteLine("Web project appsettings.json not found, falling back to local directory");
                configBuilder = new ConfigurationBuilder()
                    .SetBasePath(Directory.GetCurrentDirectory())
                    .AddJsonFile("appsettings.json", optional: false)
                    .AddJsonFile($"appsettings.{Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production"}.json", optional: true);
            }
            
            // Add environment variables to configuration
            configBuilder.AddEnvironmentVariables();
            
            // Add user secrets
            configBuilder.AddUserSecrets<YuzuDbContext>(optional: true);
            
            // Add Kubernetes secrets if running in Kubernetes
            // This requires the KubernetesConfigurationExtensions from Yuzu.Web,
            // but we can't reference it directly to avoid circular dependencies.
            // So we'll check manually for Kubernetes environment and add configuration source if needed.
            bool isRunningInKubernetes = IsRunningInKubernetes();
            if (isRunningInKubernetes)
            {
                Console.WriteLine("Kubernetes environment detected. Connection strings and secrets will be loaded from Kubernetes secrets.");
                
                // Note: In a real Kubernetes environment, the actual secrets will be available as environment variables
                // injected into the pod. They will be picked up by the .AddEnvironmentVariables() call above.
                // For design-time migrations, this won't be available, but that's okay because you typically
                // run those outside of Kubernetes.
            }
            
            // Build configuration
            IConfigurationRoot configuration = configBuilder.Build();

            // Get connection string
            var connectionString = configuration.GetConnectionString("DefaultConnection");
            
            if (string.IsNullOrEmpty(connectionString))
            {
                throw new InvalidOperationException("Could not find a connection string. Ensure that ConnectionStrings:DefaultConnection is set in appsettings.json, user secrets, or Kubernetes secrets.");
            }

            Console.WriteLine($"Connection string found. Using database: {GetDatabaseName(connectionString)}");

            // Create DbContext options
            var optionsBuilder = new DbContextOptionsBuilder<YuzuDbContext>();
            optionsBuilder.UseNpgsql(connectionString);

            return new YuzuDbContext(optionsBuilder.Options, configuration);
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