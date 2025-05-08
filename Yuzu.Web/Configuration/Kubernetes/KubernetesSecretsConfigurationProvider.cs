using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;
using k8s;
using k8s.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Yuzu.Web.Configuration.Kubernetes
{
    /// <summary>
    /// Configuration provider that loads configuration from Kubernetes secrets
    /// </summary>
    public class KubernetesSecretsConfigurationProvider : ConfigurationProvider
    {
        private readonly string _namespace;
        private readonly string _secretName;
        private readonly ILogger? _logger;
        private readonly Dictionary<string, string> _secretMappings;

        /// <summary>
        /// Initializes a new instance of the <see cref="KubernetesSecretsConfigurationProvider"/> class
        /// </summary>
        /// <param name="namespace">The Kubernetes namespace containing the secrets</param>
        /// <param name="secretName">The name of the Kubernetes secret</param>
        /// <param name="secretMappings">Optional mapping between secret keys and configuration keys</param>
        /// <param name="logger">Logger instance</param>
        public KubernetesSecretsConfigurationProvider(
            string @namespace, 
            string secretName, 
            Dictionary<string, string>? secretMappings = null,
            ILogger? logger = null)
        {
            _namespace = @namespace ?? "default";
            _secretName = secretName ?? throw new ArgumentNullException(nameof(secretName));
            _secretMappings = secretMappings ?? new Dictionary<string, string>();
            _logger = logger;
        }

        /// <summary>
        /// Loads configuration data from the Kubernetes secret
        /// </summary>
        public override void Load()
        {
            try
            {
                var config = KubernetesClientConfiguration.InClusterConfig();
                using var client = new k8s.Kubernetes(config);
                
                var secretTask = Task.Run(async () => 
                    await client.ReadNamespacedSecretAsync(_secretName, _namespace));
                
                var secret = secretTask.Result;
                if (secret?.Data == null)
                {
                    _logger?.LogWarning(
                        "Unable to load Kubernetes secret {SecretName} in namespace {Namespace}", 
                        _secretName, 
                        _namespace);
                    return;
                }

                var data = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                
                foreach (var item in secret.Data)
                {
                    // Secret values are stored as base64-encoded byte arrays
                    string decodedValue = Encoding.UTF8.GetString(item.Value);
                    
                    // If we have a mapping for this key, use the mapped key, otherwise use the original
                    string configKey = _secretMappings.TryGetValue(item.Key, out var mappedKey) 
                        ? mappedKey 
                        : item.Key;
                    
                    // Add the key-value pair to our configuration data
                    data[configKey] = decodedValue;
                }
                
                Data = data as IDictionary<string, string?>;
                
                _logger?.LogInformation(
                    "Successfully loaded {Count} configuration values from Kubernetes secret {SecretName}", 
                    Data.Count, 
                    _secretName);
            }
            catch (Exception ex)
            {
                _logger?.LogError(
                    ex, 
                    "Error loading configuration from Kubernetes secret {SecretName}: {Message}", 
                    _secretName, 
                    ex.Message);
                
                // Don't throw exceptions on configuration load failures
                // Just continue with an empty configuration
                Data = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);
            }
        }
    }
}