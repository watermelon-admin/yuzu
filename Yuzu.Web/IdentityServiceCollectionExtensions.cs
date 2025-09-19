using Microsoft.AspNetCore.Identity;
using Azure.Data.Tables;
using Yuzu.Web.Data;
using IdentityConfiguration = ElCamino.AspNetCore.Identity.AzureTable.Model.IdentityConfiguration;

namespace Yuzu.Web
{
    /// <summary>
    /// Extension methods for registering identity services in the dependency injection container
    /// </summary>
    public static class IdentityServiceCollectionExtensions
    {
        /// <summary>
        /// Adds ASP.NET Core Identity with Azure Tables storage to the service collection
        /// </summary>
        /// <param name="services">The service collection</param>
        /// <param name="configuration">The application configuration</param>
        /// <returns>The service collection for chaining</returns>
        public static IServiceCollection AddYuzuIdentity(this IServiceCollection services, IConfiguration configuration)
        {
            // Get Azure Storage connection string from configuration
            var connectionString = configuration.GetConnectionString("AzureStorage");

            if (string.IsNullOrEmpty(connectionString))
            {
                throw new InvalidOperationException("Could not find Azure Storage connection string. Ensure that ConnectionStrings:AzureStorage is set in appsettings.json or user secrets.");
            }

            // Configure Identity with Azure Tables using ElCamino with custom User and Role types
            services.AddDefaultIdentity<ApplicationUser>(options =>
            {
                // Password settings - relaxed for initial testing
                options.Password.RequireDigit = false;
                options.Password.RequireLowercase = false;
                options.Password.RequireNonAlphanumeric = false;
                options.Password.RequireUppercase = false;
                options.Password.RequiredLength = 3;
                options.Password.RequiredUniqueChars = 1;

                // User settings
                options.User.RequireUniqueEmail = true;

                // Sign-in settings
                options.SignIn.RequireConfirmedAccount = false; // Set to true in production

                // Lockout settings
                options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
                options.Lockout.MaxFailedAccessAttempts = 5;
            })
            .AddRoles<ApplicationRole>()
            .AddAzureTableStores<ApplicationDbContext>(
                () => new IdentityConfiguration
                {
                    TablePrefix = "AspNetIdentity",
                    IndexTableName = "AspNetIndex",
                    RoleTableName = "AspNetRoles",
                    UserTableName = "AspNetUsers"
                },
                () => new TableServiceClient(connectionString)
            )
            .CreateAzureTablesIfNotExists<ApplicationDbContext>();

            return services;
        }
    }
}