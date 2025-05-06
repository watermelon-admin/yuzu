#!/bin/bash
# Setup script for Scaleway DNS configuration for Traefik with wildcard certificates

# Exit on any error
set -e

# Check if Scaleway CLI is installed
if ! command -v scw &> /dev/null; then
    echo "Scaleway CLI is not installed. Installing..."
    curl -o /usr/local/bin/scw -L "https://github.com/scaleway/scaleway-cli/releases/latest/download/scw-linux-x86_64"
    chmod +x /usr/local/bin/scw
    echo "Scaleway CLI installed successfully."
    echo "Please initialize it with 'scw init' before continuing."
    exit 1
fi

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo "kubectl is not installed. Please install it first."
    exit 1
fi

# Prompt for domain and Scaleway credentials
read -p "Your domain name (e.g., example.com): " DOMAIN_NAME
read -p "Scaleway Access Key: " SCW_ACCESS_KEY
read -sp "Scaleway Secret Key: " SCW_SECRET_KEY
echo ""
read -p "Scaleway region (default: fr-par): " SCW_REGION
SCW_REGION=${SCW_REGION:-fr-par}
read -p "Email address for Let's Encrypt: " EMAIL_ADDRESS

# Create a Kubernetes secret for Scaleway DNS credentials
echo "Creating Kubernetes secret for Scaleway DNS credentials..."
kubectl create namespace traefik 2>/dev/null || true
kubectl create secret generic scaleway-dns-credentials \
  --namespace traefik \
  --from-literal=access_key="${SCW_ACCESS_KEY}" \
  --from-literal=secret_key="${SCW_SECRET_KEY}" \
  --dry-run=client -o yaml | kubectl apply -f -

# Create values file for Traefik Helm chart
echo "Creating Traefik Helm values file..."
cat > traefik-values.yaml << EOF
additionalArguments:
  - --providers.kubernetesingress.ingressclass=traefik
  - --providers.kubernetescrd.ingressclass=traefik
  - --entrypoints.websecure.http.tls=true
  - --accesslog=true
  - --log.level=INFO
  - --certificatesresolvers.letsencrypt.acme.dnschallenge=true
  - --certificatesresolvers.letsencrypt.acme.dnschallenge.provider=scaleway
  - --certificatesresolvers.letsencrypt.acme.email=${EMAIL_ADDRESS}
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
  - name: SCW_DEFAULT_REGION
    value: ${SCW_REGION}

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
EOF

# Install Traefik with Helm
echo "Adding Traefik Helm repository..."
helm repo add traefik https://traefik.github.io/charts
helm repo update

echo "Installing Traefik with Helm..."
helm install traefik traefik/traefik -n traefik -f traefik-values.yaml

echo "Waiting for Traefik to be ready..."
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=traefik -n traefik --timeout=120s

# Create wildcard certificate request with DNS-01 challenge
echo "Creating wildcard certificate request..."
cat > wildcard-cert.yaml << EOF
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: wildcard-certificate
spec:
  entryPoints:
    - websecure
  routes:
  - match: Host(\`dummy.${DOMAIN_NAME}\`)
    kind: Rule
    services:
    - name: noop@internal
      kind: TraefikService
  tls:
    certResolver: letsencrypt
    domains:
    - main: "${DOMAIN_NAME}"
      sans:
      - "*.${DOMAIN_NAME}"
EOF

kubectl apply -f wildcard-cert.yaml

echo "Waiting for loadbalancer IP..."
while [ -z "$LB_IP" ]; do
  LB_IP=$(kubectl get svc -n traefik traefik -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || true)
  if [ -z "$LB_IP" ]; then
    echo "Waiting for LoadBalancer IP assignment..."
    sleep 5
  fi
done

echo "Traefik LoadBalancer IP: $LB_IP"
echo ""
echo "==================================================================="
echo "Setup complete! Next steps:"
echo ""
echo "1. Create DNS records at your domain provider:"
echo "   * Create an A record for ${DOMAIN_NAME} pointing to $LB_IP"
echo "   * Create an A record for *.${DOMAIN_NAME} pointing to $LB_IP"
echo ""
echo "2. Wait for the certificate to be issued. Check with:"
echo "   kubectl exec -it -n traefik \$(kubectl get pods -n traefik -l app.kubernetes.io/name=traefik -o name | head -n 1) -- cat /data/acme.json"
echo ""
echo "3. Create your application IngressRoute, for example:"
echo "   kubectl apply -f yuzu-ingress-route.yaml"
echo "==================================================================="