#!/bin/bash
# Script to import an existing wildcard certificate into Kubernetes for use with Traefik

# Exit on any error
set -e

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo "kubectl is not installed. Please install it first."
    exit 1
fi

# Prompt for certificate information
read -p "Path to certificate file (fullchain.pem): " CERT_FILE
CERT_FILE=${CERT_FILE:-fullchain.pem}

read -p "Path to private key file (privkey.pem): " KEY_FILE
KEY_FILE=${KEY_FILE:-privkey.pem}

read -p "Domain name (e.g., example.com): " DOMAIN_NAME

read -p "Kubernetes namespace to create the secret in (default): " NAMESPACE
NAMESPACE=${NAMESPACE:-default}

# Validate files exist
if [ ! -f "$CERT_FILE" ]; then
    echo "Certificate file not found: $CERT_FILE"
    exit 1
fi

if [ ! -f "$KEY_FILE" ]; then
    echo "Private key file not found: $KEY_FILE"
    exit 1
fi

# Validate certificate format
echo "Validating certificate..."
if ! openssl x509 -in "$CERT_FILE" -text -noout > /dev/null; then
    echo "Invalid certificate file format"
    exit 1
fi

# Validate key format
echo "Validating private key..."
if ! openssl rsa -in "$KEY_FILE" -check -noout > /dev/null; then
    echo "Invalid private key file format"
    exit 1
fi

# Create Kubernetes TLS secret
echo "Creating Kubernetes TLS secret 'wildcard-$DOMAIN_NAME-tls' in namespace '$NAMESPACE'..."
kubectl create secret tls "wildcard-$DOMAIN_NAME-tls" \
  --cert="$CERT_FILE" \
  --key="$KEY_FILE" \
  --namespace="$NAMESPACE" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "Secret created successfully!"

# Verify the secret was created
if kubectl get secret "wildcard-$DOMAIN_NAME-tls" -n "$NAMESPACE" > /dev/null; then
    echo "✅ Secret 'wildcard-$DOMAIN_NAME-tls' verified in namespace '$NAMESPACE'"
    
    # Create a sample IngressRoute
    echo "Creating a sample IngressRoute that uses the certificate..."
    
    cat > "ingress-route-sample.yaml" << EOF
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: sample-route
  namespace: $NAMESPACE
spec:
  entryPoints:
    - websecure
  routes:
  - match: Host(\`app.$DOMAIN_NAME\`)
    kind: Rule
    services:
    - name: your-service
      port: 80
  tls:
    secretName: wildcard-$DOMAIN_NAME-tls
EOF
    
    echo "Sample IngressRoute saved to 'ingress-route-sample.yaml'"
    echo ""
    echo "To use this certificate with Traefik, reference it in your IngressRoute:"
    echo ""
    echo "apiVersion: traefik.io/v1alpha1"
    echo "kind: IngressRoute"
    echo "metadata:"
    echo "  name: yuzu-route"
    echo "spec:"
    echo "  entryPoints:"
    echo "    - websecure"
    echo "  routes:"
    echo "  - match: Host(\`yuzu.$DOMAIN_NAME\`)"
    echo "    kind: Rule"
    echo "    services:"
    echo "    - name: yuzu-web-service"
    echo "      port: 80"
    echo "  tls:"
    echo "    secretName: wildcard-$DOMAIN_NAME-tls"
else
    echo "⚠️ Failed to verify secret creation."
fi