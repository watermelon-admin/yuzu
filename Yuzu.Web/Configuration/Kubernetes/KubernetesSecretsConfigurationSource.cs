using System.Collections.Generic;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Yuzu.Web.Configuration.Kubernetes
{
    /// <summary>
    /// Configuration source for Kubernetes secrets
    /// </summary>
    public class KubernetesSecretsConfigurationSource : IConfigurationSource
    {
        /// <summary>
        /// Gets or sets the Kubernetes namespace containing the secrets
        /// </summary>
        public string Namespace { get; set; } = "default";
        
        /// <summary>
        /// Gets or sets the name of the Kubernetes secret
        /// </summary>
        public required string SecretName { get; set; }
        
        /// <summary>
        /// Gets or sets the optional mapping between secret keys and configuration keys
        /// </summary>
        public Dictionary<string, string> SecretMappings { get; set; } = new Dictionary<string, string>();
        
        /// <summary>
        /// Gets or sets the logger instance
        /// </summary>
        public ILogger? Logger { get; set; }

        /// <summary>
        /// Builds the <see cref="KubernetesSecretsConfigurationProvider"/> for this source
        /// </summary>
        /// <param name="builder">The configuration builder</param>
        /// <returns>A <see cref="KubernetesSecretsConfigurationProvider"/></returns>
        public IConfigurationProvider Build(IConfigurationBuilder builder)
        {
            return new KubernetesSecretsConfigurationProvider(
                Namespace, 
                SecretName, 
                SecretMappings,
                Logger);
        }
    }
}