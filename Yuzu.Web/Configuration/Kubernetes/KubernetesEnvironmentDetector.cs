using System;
using System.IO;

namespace Yuzu.Web.Configuration.Kubernetes
{
    /// <summary>
    /// Provides methods to detect if the application is running in a Kubernetes environment
    /// </summary>
    public static class KubernetesEnvironmentDetector
    {
        /// <summary>
        /// Standard environment variable that is set when running in Kubernetes
        /// </summary>
        private const string KubernetesServiceHostEnvVar = "KUBERNETES_SERVICE_HOST";
        
        /// <summary>
        /// Path to the service account token file that exists in Kubernetes pods
        /// </summary>
        private const string ServiceAccountTokenPath = "/var/run/secrets/kubernetes.io/serviceaccount/token";

        /// <summary>
        /// Determines if the application is running in a Kubernetes environment
        /// </summary>
        /// <returns>True if running in Kubernetes, false otherwise</returns>
        public static bool IsRunningInKubernetes()
        {
            // Check for the Kubernetes service host environment variable
            if (!string.IsNullOrEmpty(Environment.GetEnvironmentVariable(KubernetesServiceHostEnvVar)))
            {
                return true;
            }

            // Check for the existence of the service account token file
            if (File.Exists(ServiceAccountTokenPath))
            {
                return true;
            }

            return false;
        }
    }
}