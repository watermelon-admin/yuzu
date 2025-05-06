using System;
using System.Collections.Generic;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Yuzu.Web.Configuration.Kubernetes
{
    /// <summary>
    /// Extension methods for adding Kubernetes secrets configuration to a configuration builder
    /// </summary>
    public static class KubernetesConfigurationExtensions
    {
        /// <summary>
        /// Adds Kubernetes secrets configuration if running in a Kubernetes environment
        /// </summary>
        /// <param name="builder">The configuration builder</param>
        /// <param name="secretName">The name of the Kubernetes secret</param>
        /// <param name="namespace">The Kubernetes namespace (default: "default")</param>
        /// <param name="secretMappings">Optional mapping between secret keys and configuration keys</param>
        /// <param name="logger">Optional logger instance</param>
        /// <returns>The configuration builder</returns>
        public static IConfigurationBuilder AddKubernetesSecretsIfAvailable(
            this IConfigurationBuilder builder,
            string secretName,
            string @namespace = "default",
            Dictionary<string, string>? secretMappings = null,
            ILogger? logger = null)
        {
            if (builder == null)
            {
                throw new ArgumentNullException(nameof(builder));
            }

            if (string.IsNullOrEmpty(secretName))
            {
                throw new ArgumentException("Secret name cannot be null or empty", nameof(secretName));
            }

            // Only add Kubernetes configuration if running in Kubernetes
            if (KubernetesEnvironmentDetector.IsRunningInKubernetes())
            {
                logger?.LogInformation("Kubernetes environment detected, adding secrets configuration for secret {SecretName}", secretName);
                
                return builder.Add(new KubernetesSecretsConfigurationSource
                {
                    SecretName = secretName,
                    Namespace = @namespace ?? "default",
                    SecretMappings = secretMappings ?? new Dictionary<string, string>(),
                    Logger = logger
                });
            }

            logger?.LogInformation("Not running in Kubernetes, skipping Kubernetes secrets configuration");
            return builder;
        }
    }
}