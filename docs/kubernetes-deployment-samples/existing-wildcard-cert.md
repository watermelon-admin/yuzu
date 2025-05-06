# Using an Existing Wildcard Certificate with Traefik on Scaleway Kapsule

This guide explains how to use your existing wildcard certificate with Traefik on a Scaleway Kapsule cluster.

## 1. Creating a Kubernetes TLS Secret from Your Certificate

First, you need to create a Kubernetes TLS secret from your existing certificate files. Ensure you have the following files:
- Certificate file (typically with `.crt` or `.pem` extension)
- Private key file (typically with `.key` extension)

Create the TLS secret:

```bash
kubectl create secret tls wildcard-yourdomain-tls \
  --cert=/path/to/your/certificate.crt \
  --key=/path/to/your/private-key.key
```

## 2. Install Traefik using Helm without Let's Encrypt Configuration

Create a `traefik-values.yaml` file for Traefik configuration without Let's Encrypt:

```yaml
# traefik-values.yaml for existing certificates
additionalArguments:
  - --providers.kubernetesingress.ingressclass=traefik
  - --providers.kubernetescrd.ingressclass=traefik
  - --entrypoints.websecure.http.tls=true
  - --accesslog=true
  - --log.level=INFO
  # No Let's Encrypt configuration needed here

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

securityContext:
  capabilities:
    drop: [ALL]
    add: [NET_BIND_SERVICE]
  readOnlyRootFilesystem: true
  runAsGroup: 65532
  runAsNonRoot: true
  runAsUser: 65532
```

Install Traefik with the custom values:

```bash
# Add Traefik Helm repository
helm repo add traefik https://traefik.github.io/charts
helm repo update

# Create namespace for Traefik
kubectl create namespace traefik

# Install Traefik
helm install traefik traefik/traefik -n traefik -f traefik-values.yaml
```

## 3. Creating IngressRoutes with Your Existing Certificate

Create an IngressRoute for your application, referencing your existing certificate:

```yaml
# yuzu-ingress-route.yaml
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
    middlewares:
    - name: yuzu-compress
    - name: yuzu-headers
  tls:
    secretName: wildcard-yourdomain-tls  # Reference your existing certificate secret
---
# Define middlewares for compression and security headers
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: yuzu-compress
spec:
  compress: {}
---
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: yuzu-headers
spec:
  headers:
    browserXssFilter: true
    contentTypeNosniff: true
    forceSTSHeader: true
    stsIncludeSubdomains: true
    stsPreload: true
    stsSeconds: 31536000
    customFrameOptionsValue: "SAMEORIGIN"
    customRequestHeaders:
      X-Forwarded-Proto: "https"
```

Apply this configuration:

```bash
kubectl apply -f yuzu-ingress-route.yaml
```

## 4. Using a Default Certificate for Multiple Domains

If you want to use your wildcard certificate as the default certificate for all domains, you can configure Traefik to use it:

```yaml
# traefik-values.yaml with default certificate
additionalArguments:
  - --providers.kubernetesingress.ingressclass=traefik
  - --providers.kubernetescrd.ingressclass=traefik
  - --entrypoints.websecure.http.tls=true
  - --entrypoints.websecure.http.tls.domains[0].main=yourdomain.com
  - --entrypoints.websecure.http.tls.domains[0].sans=*.yourdomain.com
  - --accesslog=true
  - --log.level=INFO

# TLS store with default certificate
tlsStore:
  default:
    defaultCertificate:
      secretName: wildcard-yourdomain-tls

# Other settings as above...
```

## 5. Certificate Rotation

When your certificate needs to be renewed:

1. Update the existing TLS secret with the new certificate:

```bash
kubectl create secret tls wildcard-yourdomain-tls \
  --cert=/path/to/your/new-certificate.crt \
  --key=/path/to/your/new-private-key.key \
  --dry-run=client -o yaml | kubectl apply -f -
```

2. Restart Traefik to ensure it picks up the new certificate:

```bash
kubectl rollout restart deployment traefik -n traefik
```

## 6. Troubleshooting

### Check Certificate Secret

```bash
kubectl describe secret wildcard-yourdomain-tls
```

### Check Traefik Logs

```bash
kubectl logs -f -n traefik $(kubectl get pods -n traefik -l app.kubernetes.io/name=traefik -o jsonpath='{.items[0].metadata.name}')
```

### Check IngressRoute Status

```bash
kubectl describe ingressroute yuzu-route
```

### TLS Verification

You can verify the TLS certificate from outside the cluster:

```bash
echo | openssl s_client -showcerts -servername yuzu.yourdomain.com -connect yuzu.yourdomain.com:443 2>/dev/null | openssl x509 -inform pem -noout -text
```