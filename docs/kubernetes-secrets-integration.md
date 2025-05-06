# Kubernetes Secrets Integration

This document explains how the Yuzu application integrates with Kubernetes secrets for configuration management.

## Overview

The Kubernetes secrets integration allows the application to automatically detect when it's running in a Kubernetes environment and load configuration from Kubernetes secrets instead of the standard `appsettings.json` files. This provides a more secure way to manage sensitive configuration data in production environments.

## How It Works

1. **Environment Detection**: The application automatically detects if it's running in a Kubernetes environment by checking:
   - The presence of the `KUBERNETES_SERVICE_HOST` environment variable
   - The existence of the standard Kubernetes service account token file

2. **Secret Loading**: When running in Kubernetes, the application will:
   - Connect to the Kubernetes API using the in-cluster configuration
   - Load the specified secret (`yuzu-app-secrets` by default)
   - Decode the values from base64
   - Add them to the application's configuration system

3. **Configuration Hierarchy**: Kubernetes secrets take precedence over other configuration sources, allowing you to override settings when deployed to Kubernetes.

## Usage

No code changes are needed to your application, as the feature is automatically enabled in the `Yuzu.ServiceDefaults` package. The integration is added in the `AddServiceDefaults()` method that all Yuzu projects use.

### Creating the Kubernetes Secret

To create a Kubernetes secret for your application configuration:

```bash
# Create a secret from literal values
kubectl create secret generic yuzu-app-secrets \
  --from-literal=S3Settings__AccessKey=your_access_key \
  --from-literal=S3Settings__SecretKey=your_secret_key \
  --from-literal=DataStorageConfig__ConnectionString=your_connection_string

# Or create from a file
kubectl create secret generic yuzu-app-secrets --from-file=./secrets.txt
```

### Secret Key Mapping

By default, secret keys are used directly as configuration keys. You can also configure mapping between secret keys and configuration keys if needed by modifying the `secretMappings` parameter in the `AddKubernetesSecretsIfAvailable` method.

## Customization

You can customize the Kubernetes secrets integration by modifying the `AddKubernetesConfigurationIfAvailable` method in `Yuzu.ServiceDefaults/Extensions.cs`:

```csharp
// Change the secret name or namespace
builder.Configuration.AddKubernetesSecretsIfAvailable(
    secretName: "my-custom-secret-name",
    @namespace: "my-custom-namespace",
    logger: logger);

// Add key mapping to map from secret keys to configuration keys
var secretMappings = new Dictionary<string, string>
{
    { "DB_PASSWORD", "DataStorageConfig:ConnectionString" },
    { "S3_ACCESS_KEY", "S3Settings:AccessKey" }
};
builder.Configuration.AddKubernetesSecretsIfAvailable(
    secretName: "yuzu-app-secrets",
    @namespace: "default",
    secretMappings: secretMappings,
    logger: logger);
```

## Troubleshooting

If you're having issues with the Kubernetes secrets integration:

1. Check the application logs for messages related to Kubernetes detection and secret loading
2. Verify that your application has the necessary permissions to read secrets
3. Ensure the secret exists in the specified namespace
4. Validate that your pod's service account has permission to read secrets

## Security Considerations

- The Kubernetes secrets integration uses the pod's service account to access the Kubernetes API
- Ensure your service account has the minimal necessary permissions
- Kubernetes secrets are stored base64-encoded but not encrypted in etcd
- Consider using a secret management solution like HashiCorp Vault for highly sensitive secrets