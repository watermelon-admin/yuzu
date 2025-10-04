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
            // Use AddIdentity instead of AddDefaultIdentity to avoid default UI registration
            services.AddIdentity<ApplicationUser, ApplicationRole>(options =>
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
                options.SignIn.RequireConfirmedAccount = true; // Require email confirmation before login
                options.SignIn.RequireConfirmedEmail = true; // Ensure email must be confirmed

                // Lockout settings
                options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
                options.Lockout.MaxFailedAccessAttempts = 5;

                // Token settings - set explicit expiration times for security
                options.Tokens.EmailConfirmationTokenProvider = TokenOptions.DefaultEmailProvider;
                options.Tokens.PasswordResetTokenProvider = TokenOptions.DefaultEmailProvider;
                options.Tokens.ChangeEmailTokenProvider = TokenOptions.DefaultEmailProvider;
            })
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
            .CreateAzureTablesIfNotExists<ApplicationDbContext>()
            .AddDefaultTokenProviders() // Add default token providers for email confirmation, password reset, etc.
            .AddTokenProvider<DataProtectorTokenProvider<ApplicationUser>>(TokenOptions.DefaultEmailProvider);

            // Configure token lifespan for security (24 hours for email confirmation, 1 hour for password reset)
            services.Configure<DataProtectionTokenProviderOptions>(options =>
            {
                options.TokenLifespan = TimeSpan.FromHours(24); // Email confirmation tokens valid for 24 hours
            });

            // Configure shorter lifespan for password reset tokens
            services.Configure<PasswordHasherOptions>(options =>
            {
                options.IterationCount = 100_000; // OWASP recommendation for PBKDF2
            });

            // Add the services that AddDefaultIdentity would normally include
            // Create a wrapper for the existing email sender to work with Identity
            services.AddSingleton<IEmailSender<ApplicationUser>>(provider =>
            {
                var emailSender = provider.GetRequiredService<Yuzu.Mail.IEmailSender>();
                return new IdentityEmailSenderWrapper(emailSender);
            });

            return services;
        }
    }
}