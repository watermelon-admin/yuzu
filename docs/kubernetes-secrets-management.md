# Kubernetes Secrets Management for Yuzu

This guide explains how the Yuzu application integrates with Kubernetes secrets and how to manage these secrets effectively.

## How Yuzu Uses Kubernetes Secrets

The Yuzu application automatically detects when it's running in a Kubernetes environment and loads configuration from Kubernetes secrets. This provides a more secure way to manage sensitive configuration data in production environments.

### Detection Mechanism

The application automatically detects if it's running in Kubernetes by checking:
- The presence of the `KUBERNETES_SERVICE_HOST` environment variable
- The existence of the standard Kubernetes service account token file

When running in Kubernetes, the application will:
1. Connect to the Kubernetes API using the in-cluster configuration
2. Load the specified secret (`yuzu-app-secrets` by default)
3. Decode the values from base64
4. Add them to the application's configuration system

### Configuration Hierarchy

Kubernetes secrets take precedence over other configuration sources, allowing you to override settings when deployed to Kubernetes.

## Creating and Managing Secrets

### 1. Basic Secret Creation

```bash
kubectl create secret generic yuzu-app-secrets \
  --from-literal=S3Settings__AccessKey='your-s3-access-key' \
  --from-literal=S3Settings__SecretKey='your-s3-secret-key' \
  --from-literal=DataStorageConfig__ConnectionString='your-db-connection-string'
```

### 2. Creating Secrets from Files

You can also create secrets from files, which is useful for managing configurations with multiple settings:

```bash
# Create a file with your secrets
cat > secrets.txt << EOF
S3Settings__AccessKey=your-s3-access-key
S3Settings__SecretKey=your-s3-secret-key
DataStorageConfig__ConnectionString=your-db-connection-string
PaymentConfig__Stripe__SecretKey=your-stripe-key
EOF

# Create the secret from the file
kubectl create secret generic yuzu-app-secrets --from-file=./secrets.txt
```

### 3. Updating Secrets

To update an existing secret:

```bash
kubectl create secret generic yuzu-app-secrets \
  --from-literal=S3Settings__AccessKey='new-access-key' \
  --from-literal=S3Settings__SecretKey='new-secret-key' \
  --dry-run=client -o yaml | kubectl apply -f -
```

### 4. Viewing Secrets

To view the secret keys (not values):

```bash
kubectl get secret yuzu-app-secrets -o jsonpath='{.data}' | jq 'keys'
```

To decode a specific value:

```bash
kubectl get secret yuzu-app-secrets -o jsonpath="{.data.S3Settings__AccessKey}" | base64 --decode
```

## Secret Key Mapping

By default, secret keys are used directly as configuration keys (with double underscores `__` representing nesting). For example, the secret key `S3Settings__AccessKey` maps to the configuration key `S3Settings:AccessKey`.

You can configure custom mapping between secret keys and configuration keys by modifying the `secretMappings` parameter in the `Program.cs` file:

```csharp
var secretMappings = new Dictionary<string, string>
{
    { "DB_PASSWORD", "DataStorageConfig:ConnectionString" },
    { "S3_ACCESS_KEY", "S3Settings:AccessKey" }
};

builder.Configuration.AddKubernetesSecretsConfiguration(
    secretName: "yuzu-app-secrets",
    @namespace: "default",
    secretMappings: secretMappings,
    logger: logger);
```

This allows you to use simpler secret keys that follow Kubernetes naming conventions while still mapping to the correct configuration paths in your application.

## Required Secret Keys

For the Yuzu application, the following secret keys are required:

```
S3Settings__AccessKey
S3Settings__SecretKey
S3Settings__ServiceUrl
S3Settings__BucketName
DataStorageConfig__ConnectionString
PaymentConfig__Stripe__SecretKey
PaymentConfig__Stripe__PublishableKey
MailConnectionConfig__smtpServer
MailConnectionConfig__smtpUsername
MailConnectionConfig__smtpPassword
```

## Security Best Practices

When working with Kubernetes secrets, follow these best practices:

1. **Least Privilege**: Ensure your pod's service account has only the necessary permissions to read the required secrets.

2. **Secret Rotation**: Regularly rotate secrets and credentials.

3. **Environment Separation**: Use different namespaces and secrets for development, staging, and production environments.

4. **Encryption**: Enable [encryption at rest](https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/) for etcd to provide an additional layer of security for your secrets.

5. **External Secret Management**: For highly sensitive environments, consider using a dedicated secret management solution like HashiCorp Vault or Azure Key Vault.

## Troubleshooting

If you're having issues with Kubernetes secrets:

1. Check that the secret exists:
   ```bash
   kubectl get secret yuzu-app-secrets
   ```

2. Verify the pod's service account has permissions to read secrets:
   ```bash
   kubectl auth can-i --as=system:serviceaccount:default:default get secrets
   ```

3. Check application logs for messages related to Kubernetes detection and secret loading:
   ```bash
   kubectl logs deployment/yuzu-web
   ```

4. Verify the secret contains the expected keys:
   ```bash
   kubectl get secret yuzu-app-secrets -o jsonpath='{.data}' | jq 'keys'
   ```