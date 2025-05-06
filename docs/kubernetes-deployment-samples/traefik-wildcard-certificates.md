# Configuring Traefik with Wildcard Certificates on Scaleway Kapsule

This guide explains how to set up Traefik ingress controller with wildcard certificates on a Scaleway Kapsule cluster.

## 1. Install Traefik using Helm

First, add the Traefik Helm repository and create a namespace:

```bash
# Add Traefik Helm repository
helm repo add traefik https://traefik.github.io/charts
helm repo update

# Create namespace for Traefik
kubectl create namespace traefik
```

Create a `values.yaml` file for Traefik configuration:

```yaml
# traefik-values.yaml
additionalArguments:
  - --providers.kubernetesingress.ingressclass=traefik
  - --providers.kubernetescrd.ingressclass=traefik
  - --entrypoints.websecure.http.tls=true
  - --accesslog=true
  - --log.level=INFO
  - --certificatesresolvers.letsencrypt.acme.dnschallenge=true
  - --certificatesresolvers.letsencrypt.acme.dnschallenge.provider=scaleway
  - --certificatesresolvers.letsencrypt.acme.email=your-email@yourdomain.com
  - --certificatesresolvers.letsencrypt.acme.storage=/data/acme.json

env:
  - name: SCW_ACCESS_KEY
    valueFrom:
      secretKeyRef:
        name: scaleway-dns-credentials
        key: access_key
  - name: SCW_SECRET_KEY
    valueFrom:
      secretKeyRef:
        name: scaleway-dns-credentials
        key: secret_key

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

persistence:
  enabled: true
  name: traefik-data
  size: 1Gi
  path: /data

securityContext:
  capabilities:
    drop: [ALL]
    add: [NET_BIND_SERVICE]
  readOnlyRootFilesystem: true
  runAsGroup: 65532
  runAsNonRoot: true
  runAsUser: 65532
```

First, create a secret with your Scaleway DNS credentials:

```bash
kubectl create secret generic scaleway-dns-credentials \
  --namespace traefik \
  --from-literal=access_key=YOUR_SCW_ACCESS_KEY \
  --from-literal=secret_key=YOUR_SCW_SECRET_KEY
```

Install Traefik with the custom values:

```bash
helm install traefik traefik/traefik -n traefik -f traefik-values.yaml
```

## 2. Create a Wildcard Certificate with Traefik CRD

Traefik can manage certificates directly using its CRD resources. Create an IngressRoute with a wildcard certificate:

```yaml
# wildcard-certificate.yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: wildcard-certificate
spec:
  entryPoints:
    - websecure
  routes:
  - match: Host(`dummy.yourdomain.com`)
    kind: Rule
    services:
    - name: noop@internal
      kind: TraefikService
  tls:
    certResolver: letsencrypt
    domains:
    - main: "yourdomain.com"
      sans:
      - "*.yourdomain.com"
```

Apply this configuration:

```bash
kubectl apply -f wildcard-certificate.yaml
```

This will trigger Traefik to request a wildcard certificate from Let's Encrypt using the DNS-01 challenge with Scaleway DNS.

## 3. Check Certificate Status

To check if the certificate was issued successfully:

```bash
kubectl exec -it -n traefik $(kubectl get pods -n traefik -l app.kubernetes.io/name=traefik -o name) -- cat /data/acme.json
```

## 4. Creating IngressRoutes for Your Applications

After obtaining the wildcard certificate, you can create IngressRoutes for your applications:

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
  tls:
    certResolver: letsencrypt
```

Apply this configuration:

```bash
kubectl apply -f yuzu-ingress-route.yaml
```

## 5. Advanced Configuration: TLS Options

You can define TLS options to enhance security:

```yaml
# tls-options.yaml
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

Then, reference these options in your IngressRoute:

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
    certResolver: letsencrypt
    options:
      name: modern
      namespace: default
```

## 6. Setting Up HTTP to HTTPS Redirection

By default, Traefik redirects HTTP to HTTPS because of the `redirectTo: websecure` setting in the Helm chart values. However, you can also create a specific middleware for customized redirection:

```yaml
# redirect-middleware.yaml
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: redirect-https
spec:
  redirectScheme:
    scheme: https
    permanent: true
```

Then use it in an HTTP IngressRoute:

```yaml
# http-ingress-route.yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: yuzu-route-http
spec:
  entryPoints:
    - web
  routes:
  - match: Host(`yuzu.yourdomain.com`)
    kind: Rule
    middlewares:
    - name: redirect-https
    services:
    - name: yuzu-web-service
      port: 80
```

## 7. Troubleshooting

### Check Traefik Logs

```bash
kubectl logs -f -n traefik $(kubectl get pods -n traefik -l app.kubernetes.io/name=traefik -o jsonpath='{.items[0].metadata.name}')
```

### Check Certificate Status

```bash
kubectl exec -it -n traefik $(kubectl get pods -n traefik -l app.kubernetes.io/name=traefik -o name) -- cat /data/acme.json | jq
```

Note: You might need to install jq in the container or view the raw JSON.

### Verify IngressRoutes

```bash
kubectl get ingressroutes
kubectl describe ingressroute yuzu-route
```

### Check ACME Challenge Records

If you're using DNS-01 challenges with Scaleway DNS, check your domain's TXT records to see if the ACME challenge records are being created properly.