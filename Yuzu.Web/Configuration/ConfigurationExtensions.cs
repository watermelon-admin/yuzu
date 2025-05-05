using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using Yuzu.Configuration.S3;
using Yuzu.Configuration.Payments;

namespace Yuzu.Web.Configuration
{
    /// <summary>
    /// Extension methods for registering configuration in the dependency injection container
    /// </summary>
    public static class ConfigurationExtensions
    {
        /// <summary>
        /// Adds all application configuration to the service collection
        /// </summary>
        /// <param name="services">The service collection</param>
        /// <param name="configuration">The configuration</param>
        /// <returns>The service collection for chaining</returns>
        public static IServiceCollection AddAppConfiguration(this IServiceCollection services, IConfiguration configuration)
        {
            // Register and validate all configuration sections
            services.AddOptions<MailSettings>()
                .Bind(configuration.GetSection("MailConnectionConfig"))
                .ValidateDataAnnotations()
                .ValidateOnStart();

            // S3Settings from shared configuration project
            services.AddOptions<Yuzu.Configuration.S3.S3Settings>()
                .Bind(configuration.GetSection("S3Settings"))
                .ValidateDataAnnotations()
                .ValidateOnStart();

            // PaymentSettings from shared configuration project
            services.AddOptions<Yuzu.Configuration.Payments.PaymentSettings>()
                .Bind(configuration.GetSection("PaymentConfig"))
                .ValidateDataAnnotations()
                .ValidateOnStart();

            services.AddOptions<Yuzu.Web.Configuration.DataStorageSettings>()
                .Bind(configuration.GetSection("DataStorageConfig"))
                .ValidateDataAnnotations()
                .ValidateOnStart();

            services.AddOptions<Yuzu.Web.Configuration.DebugSettings>()
                .Bind(configuration.GetSection("DebugSettings"));

            services.AddOptions<Yuzu.Web.Configuration.IdentitySettings>()
                .Bind(configuration.GetSection("IdentityConfig"));

            return services;
        }

        /// <summary>
        /// Gets a strongly-typed configuration section from the configuration
        /// </summary>
        /// <typeparam name="T">The type of the configuration section</typeparam>
        /// <param name="configuration">The configuration</param>
        /// <param name="sectionName">The name of the section</param>
        /// <returns>The strongly-typed configuration section</returns>
        public static T GetSection<T>(this IConfiguration configuration, string sectionName) where T : new()
        {
            var section = new T();
            configuration.GetSection(sectionName).Bind(section);
            return section;
        }
    }
}