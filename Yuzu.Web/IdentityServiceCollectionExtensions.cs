using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Yuzu.Web
{
    /// <summary>
    /// Extension methods for registering identity services in the dependency injection container
    /// </summary>
    public static class IdentityServiceCollectionExtensions
    {
        /// <summary>
        /// Adds ASP.NET Core Identity with PostgreSQL storage to the service collection
        /// </summary>
        /// <param name="services">The service collection</param>
        /// <param name="configuration">The application configuration</param>
        /// <returns>The service collection for chaining</returns>
        public static IServiceCollection AddYuzuIdentity(this IServiceCollection services, IConfiguration configuration)
        {
            // Get connection string from configuration
            var connectionString = configuration.GetConnectionString("DefaultConnection");
            
            if (string.IsNullOrEmpty(connectionString))
            {
                throw new InvalidOperationException("Could not find a connection string. Ensure that ConnectionStrings:DefaultConnection is set in appsettings.json or user secrets.");
            }

            // Register the Identity DbContext
            services.AddDbContext<YuzuIdentityDbContext>(options =>
                options.UseNpgsql(connectionString));

            // Configure Identity
            services.AddIdentity<ApplicationUser, ApplicationRole>(options =>
            {
                // Require confirmed account
                options.SignIn.RequireConfirmedAccount = true;
                
                // Password requirements
                options.Password.RequireDigit = true;
                options.Password.RequireLowercase = true;
                options.Password.RequireUppercase = true;
                options.Password.RequireNonAlphanumeric = true;
                options.Password.RequiredLength = 8;
                
                // Lockout settings
                options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
                options.Lockout.MaxFailedAccessAttempts = 5;
            })
            .AddEntityFrameworkStores<YuzuIdentityDbContext>()
            .AddDefaultTokenProviders();

            // Identity DbContext initializer not needed at this point

            return services;
        }
    }
}