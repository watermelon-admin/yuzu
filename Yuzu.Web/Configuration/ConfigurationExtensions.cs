using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Logging;
using Yuzu.Configuration.S3;
using Yuzu.Configuration.Payments;
using Yuzu.Web.Configuration.Kubernetes;
using System.Collections.Generic;

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
                .Bind(configuration.GetSection("MailSettings"))
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

            services.AddOptions<Yuzu.Web.Configuration.DebugSettings>()
                .Bind(configuration.GetSection("DebugSettings"));

            services.AddOptions<Yuzu.Web.Configuration.BetaSettings>()
                .Bind(configuration.GetSection("BetaSettings"))
                .ValidateDataAnnotations()
                .ValidateOnStart();

            services.AddOptions<Yuzu.Data.AzureTables.AzureTablesSettings>()
                .Bind(configuration.GetSection("AzureTablesSettings"));

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

        /// <summary>
        /// Adds Kubernetes secrets configuration provider if running in a Kubernetes environment
        /// </summary>
        /// <param name="builder">The configuration builder</param>
        /// <param name="secretName">The name of the Kubernetes secret</param>
        /// <param name="namespace">The Kubernetes namespace</param>
        /// <param name="secretMappings">Optional mapping between secret keys and configuration keys</param>
        /// <param name="logger">Optional logger instance</param>
        /// <returns>The configuration builder</returns>
        public static IConfigurationBuilder AddKubernetesSecretsConfiguration(
            this IConfigurationBuilder builder, 
            string secretName, 
            string @namespace = "default",
            Dictionary<string, string>? secretMappings = null,
            ILogger? logger = null)
        {
            if (KubernetesEnvironmentDetector.IsRunningInKubernetes())
            {
                logger?.LogInformation("Running in Kubernetes environment, adding Kubernetes secrets configuration");

                try 
                {
                    // Add application settings from the Kubernetes secret
                    // This will automatically map keys from the secret to configuration keys
                    builder.AddKubernetesSecretsIfAvailable(
                        secretName: secretName,
                        @namespace: @namespace,
                        secretMappings: secretMappings,
                        logger: logger);
                    
                    logger?.LogInformation("Kubernetes secrets configuration added successfully");
                }
                catch (System.Exception ex)
                {
                    logger?.LogWarning(ex, "Failed to add Kubernetes secrets configuration: {Message}", ex.Message);
                    logger?.LogInformation("Application will continue with default configuration sources");
                }
            }

            return builder;
        }
    }
}