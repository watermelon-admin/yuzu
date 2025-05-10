# Installation Guide: Yuzu App on Scaleway K2s Cluster

## Prerequisites
- Scaleway account with API access
- `kubectl` installed locally
- `helm` (v3+) installed locally
- Access to the Yuzu Docker registry (Scaleway Container Registry)

## 1. Create and Configure the Kubernetes Cluster

```bash
# Install Scaleway CLI
curl -o scw -L "https://github.com/scaleway/scaleway-cli/releases/download/v2.5.1/scw-2.5.1-linux-amd64"
chmod +x scw
sudo mv scw /usr/local/bin/

# Configure Scaleway CLI
scw init

# Create Kubernetes cluster
scw k8s cluster create \
  name=yuzu-cluster \
  version=1.25 \
  cni=cilium \
  pools.0.name=default \
  pools.0.node-type=DEV1-M \
  pools.0.size=2 \
  region=fr-par

# Get kubeconfig to communicate with the cluster
scw k8s kubeconfig install yuzu-cluster

# Verify connection
kubectl get nodes
```

## 2. Install Traefik Ingress Controller

```bash
# Clone the repository if you haven't already
git clone <your-repo-url>
cd k8s-deploy

# Add Traefik Helm repository
helm repo add traefik https://traefik.github.io/charts
helm repo update

# Create traefik namespace
kubectl create namespace traefik

# Install Traefik with custom values
helm install traefik traefik/traefik \
  --namespace traefik \
  -f traefik/values.yaml
  
# Verify Traefik is running
kubectl get pods -n traefik
```

## 3. Install Argo CD

```bash
# Create argocd namespace
kubectl create namespace argocd

# Add Argo CD Helm repository
helm repo add argo https://argoproj.github.io/argo-helm
helm repo update

# Install Argo CD with custom values
helm install argocd argo/argo-cd \
  --namespace argocd \
  -f argocd-values.yaml

# Wait for Argo CD to be ready
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=argocd-server -n argocd --timeout=300s

# Get the initial admin password
ARGO_PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)
echo "Argo CD Admin Password: $ARGO_PASSWORD"
```

## 4. Configure SSL/TLS Certificate

```bash
# Assuming you have your wildcard certificate files:
# - wildcard.breakscreen.com.crt (certificate file)
# - wildcard.breakscreen.com.key (private key file)
# If you have a pfx file, you'll need to extract the certificate and key first:
# openssl pkcs12 -in your-certificate.pfx -clcerts -nokeys -out wildcard.breakscreen.com.crt
# openssl pkcs12 -in your-certificate.pfx -nocerts -nodes -out wildcard.breakscreen.com.key

# Create a Kubernetes TLS secret with your certificate and key
kubectl create secret tls breakscreen-tls \
  --cert=wildcard.breakscreen.com.crt \
  --key=wildcard.breakscreen.com.key

# Verify the secret was created
kubectl get secret breakscreen-tls
```

## 5. Set Up Container Registry Credentials

```bash
# Create registry credentials secret
kubectl create secret docker-registry scaleway-registry-credentials \
  --docker-server=rg.fr-par.scw.cloud \
  --docker-username=<your-registry-namespace> \
  --docker-password=<your-scaleway-secret-key>
```

## 6. Create Application Secrets

```bash
# Create application secrets (replace with your actual values)
kubectl create secret generic yuzu-app-secrets \
  --from-literal=ASPNETCORE_ENVIRONMENT=Production \
  --from-literal=S3Settings__AccessKey=<access-key> \
  --from-literal=S3Settings__SecretKey=<secret-key> \
  --from-literal=S3Settings__ServiceUrl=<service-url> \
  --from-literal=S3Settings__BucketName=<bucket-name> \
  --from-literal=ConnectionStrings__DefaultConnection=<database-connection-string>
```

## 7. Deploy the Yuzu Application with Argo CD

### Option 1: Direct deployment with kubectl

```bash
# Apply Kubernetes manifests directly
kubectl apply -f app/service.yaml
kubectl apply -f app/deployment.yaml
kubectl apply -f app/ingress.yaml

# Verify deployment
kubectl get pods,svc,ingress
```

### Option 2: GitOps deployment with Argo CD

```bash
# Update the Argo CD application definition with your repository URL
# In yuzu-argocd-app.yaml, change the repoURL field to your actual repository URL

# Apply the Argo CD application
kubectl apply -f yuzu-argocd-app.yaml

# Check the application status
kubectl get applications -n argocd
```

## 8. Configure DNS

Get the Load Balancer IP/hostname for Traefik:

```bash
kubectl get service -n traefik traefik -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
```

Configure your DNS provider to point the following records to this IP/hostname:
- `breakscreen.com`
- `www.breakscreen.com`
- `argocd.breakscreen.com`

## 9. Verify the Installation

### Check application status:

```bash
# Check all components are running
kubectl get pods

# Check service is exposed
kubectl get svc yuzu-web

# Verify ingress is configured
kubectl get ingress yuzu-web

# Check application logs
kubectl logs -l app=yuzu-web
```

### Test the application:

```bash
# Test application health endpoint
curl -k https://breakscreen.com/health

# Access the web application in a browser
# https://breakscreen.com
```

### Access Argo CD dashboard:

```bash
# Visit https://argocd.breakscreen.com in your browser
# Login with username: admin, password: (the password you retrieved earlier)
```

## 10. Troubleshooting

If you encounter issues, refer to the TROUBLESHOOTING.md file for common problems and solutions. Here are some quick troubleshooting commands:

```bash
# Check pod status
kubectl get pods
kubectl describe pod <pod-name>

# Check Traefik logs
kubectl logs -n traefik -l app.kubernetes.io/name=traefik

# Check application logs
kubectl logs -l app=yuzu-web

# Verify SSL certificate
kubectl get secret breakscreen-tls -o yaml
```

## 11. Maintenance Operations

### Scaling the application:

```bash
kubectl scale deployment yuzu-web --replicas=3
```

### Updating the application:

```bash
kubectl set image deployment/yuzu-web yuzu-web=rg.fr-par.scw.cloud/cr-yuzu-par-1/yuzu-web:new-tag
```

### Temporarily disabling the application:

```bash
kubectl scale deployment yuzu-web --replicas=0
```