# Using Existing Wildcard Certificates with Traefik on Kubernetes

This guide explains how to use your existing wildcard certificate with Traefik ingress controller on Kubernetes.

## Prerequisites

- Existing wildcard certificate files (typically fullchain.pem and privkey.pem)
- Kubernetes cluster with Traefik installed
- kubectl configured for your cluster

## 1. Create a TLS Secret with Your Certificate

First, create a Kubernetes TLS secret from your certificate files:

```bash
kubectl create secret tls wildcard-yourdomain-tls \
  --key=/path/to/privkey.pem \
  --cert=/path/to/fullchain.pem
```

This creates a secret containing your certificate and private key, properly formatted for Kubernetes TLS.

## 2. Configure Traefik with Helm (No Certificate Resolver Needed)

If you're installing Traefik, you can skip the Let's Encrypt configuration:

```bash
# Add Traefik Helm repository
helm repo add traefik https://traefik.github.io/charts
helm repo update

# Create namespace for Traefik
kubectl create namespace traefik

# Install Traefik with custom values
cat > traefik-values.yaml << EOF
additionalArguments:
  - --providers.kubernetesingress.ingressclass=traefik
  - --providers.kubernetescrd.ingressclass=traefik
  - --entrypoints.websecure.http.tls=true
  - --accesslog=true
  - --log.level=INFO
service:
  type: LoadBalancer
  annotations:
    service.beta.kubernetes.io/scw-loadbalancer-proxy-protocol-v2: "true"
    service.beta.kubernetes.io/scw-loadbalancer-use-hostname: "true"
ports:
  web:
    port: 80
    redirectTo: websecure
  websecure:
    port: 443
    tls:
      enabled: true
EOF

helm install traefik traefik/traefik -n traefik -f traefik-values.yaml
```

## 3. Create an IngressRoute Using Your Existing Certificate

Create an IngressRoute for your application that references the TLS secret:

```yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: yuzu-route
spec:
  entryPoints:
    - websecure
  routes:
  - match: Host(`yuzu.yourdomain.com`)
    kind: Rule
    services:
    - name: yuzu-web-service
      port: 80
  tls:
    secretName: wildcard-yourdomain-tls
```

Apply this configuration:

```bash
kubectl apply -f yuzu-ingress-route.yaml
```

## 4. Using the Same Certificate for Multiple Hosts

The same wildcard certificate can be used for multiple subdomains. Create separate IngressRoute resources for each subdomain:

```yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: api-route
spec:
  entryPoints:
    - websecure
  routes:
  - match: Host(`api.yourdomain.com`)
    kind: Rule
    services:
    - name: api-service
      port: 80
  tls:
    secretName: wildcard-yourdomain-tls
```

## 5. Certificate Renewal Process

Since you're using your own certificate, you need to handle renewals manually:

1. Renew your certificate with your certificate provider
2. Update the Kubernetes TLS secret:

```bash
kubectl create secret tls wildcard-yourdomain-tls \
  --key=/path/to/new-privkey.pem \
  --cert=/path/to/new-fullchain.pem \
  --dry-run=client -o yaml | kubectl apply -f -
```

Traefik will automatically detect the updated certificate without requiring a restart.

## 6. Validating Your Certificate

To verify your certificate is properly configured:

1. Check that the secret exists:
   ```bash
   kubectl get secret wildcard-yourdomain-tls
   ```

2. Connect to your domain and check the certificate details:
   ```bash
   openssl s_client -connect yuzu.yourdomain.com:443 -servername yuzu.yourdomain.com | openssl x509 -noout -text | grep DNS:
   ```

3. Access your site in a browser and check the certificate information

## 7. TLS Options for Enhanced Security

You can define custom TLS options to enhance security:

```yaml
apiVersion: traefik.io/v1alpha1
kind: TLSOption
metadata:
  name: modern
spec:
  minVersion: VersionTLS12
  cipherSuites:
    - TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384
    - TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384
    - TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256
    - TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256
    - TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305
    - TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305
```

Then reference these options in your IngressRoute:

```yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: yuzu-route
spec:
  entryPoints:
    - websecure
  routes:
  - match: Host(`yuzu.yourdomain.com`)
    kind: Rule
    services:
    - name: yuzu-web-service
      port: 80
  tls:
    secretName: wildcard-yourdomain-tls
    options:
      name: modern
      namespace: default
```

## 8. Troubleshooting

### Certificate Not Recognized

If Traefik doesn't recognize your certificate:

1. Verify the secret format:
   ```bash
   kubectl get secret wildcard-yourdomain-tls -o yaml
   ```
   The secret should have `tls.crt` and `tls.key` keys.

2. Check for certificate format issues:
   ```bash
   kubectl get secret wildcard-yourdomain-tls -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -text -noout
   ```

3. Ensure your IngressRoute references the correct secret name

### Traefik Logs

Check Traefik logs for TLS-related errors:

```bash
kubectl logs -f -n traefik $(kubectl get pods -n traefik -l app.kubernetes.io/name=traefik -o jsonpath='{.items[0].metadata.name}')
```

### Certificate Chain Issues

If browsers show certificate errors, ensure your `fullchain.pem` includes all intermediate certificates. The correct order is:

1. Your domain certificate
2. Intermediate certificates
3. Root certificate (optional)