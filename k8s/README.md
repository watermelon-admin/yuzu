# Deploying Yuzu to Kubernetes

This guide explains how to deploy the Yuzu application to your local Kubernetes cluster.

## Prerequisites

- Docker installed and running
- Kubernetes cluster running locally
- `kubectl` configured to work with your local cluster
- Port mappings configured as follows:
  - 8443:443
  - 6443:6443
  - 8081:80

## Deployment Steps

### 1. Build the Docker Image

First, build the Docker image for the Yuzu application:

```bash
# Navigate to the project root directory
cd /mnt/d/Repos/yuzu

# Build the Docker image
docker build -t yuzu-web:latest .
```

### 2. Make the Image Available to Kubernetes

For a local Kubernetes cluster, you need to make the image available to it.

#### Option 1: Using local Docker registry with Minikube

If using Minikube, you can point your Docker client to the Minikube Docker daemon:

```bash
# For Minikube
eval $(minikube docker-env)
# Then build the image again
docker build -t yuzu-web:latest .
```

#### Option 2: Using a local Docker registry

If using Docker Desktop's Kubernetes or another local setup:

```bash
# Start a local registry
docker run -d -p 5000:5000 --name registry registry:2

# Tag the image for the local registry
docker tag yuzu-web:latest localhost:5000/yuzu-web:latest

# Push to the local registry
docker push localhost:5000/yuzu-web:latest

# Update the deployment YAML to use this image
# Change image: yuzu-web:latest to image: localhost:5000/yuzu-web:latest in yuzu-deployment.yaml
```

### 3. Apply Kubernetes Configurations

Apply the Kubernetes manifests in the following order:

```bash
# Create namespace (if not using default)
# kubectl create namespace yuzu

# Create secrets
kubectl apply -f k8s/yuzu-secrets.yaml

# Create the deployment
kubectl apply -f k8s/yuzu-deployment.yaml

# Create the service and ingress
kubectl apply -f k8s/yuzu-service.yaml
```

### 4. Check Deployment Status

Verify that everything is running correctly:

```bash
# Check pods status
kubectl get pods

# Check services
kubectl get services

# Check ingress
kubectl get ingress
```

### 5. Access the Application

If you're using Ingress, add an entry to your hosts file:

```
# Add to /etc/hosts (Linux/Mac) or C:\Windows\System32\drivers\etc\hosts (Windows)
127.0.0.1   yuzu.local
```

Then access the application at:
- http://yuzu.local:8081/ (using port mapping for HTTP)

### 6. Troubleshooting

If you encounter issues, check the logs:

```bash
# Get pod name
kubectl get pods

# View logs
kubectl logs <pod-name>

# Describe the pod for events and status
kubectl describe pod <pod-name>
```

## External Dependencies

The application depends on:

1. **PostgreSQL Database**
   - The secret assumes PostgreSQL is available at `host.docker.internal:5432`
   - You can run PostgreSQL using Docker: 
     ```bash
     docker run -d --name postgres -p 5432:5432 -e POSTGRES_USER=yuzu -e POSTGRES_PASSWORD=yuzu_dev_password -e POSTGRES_DB=yuzu postgres:14
     ```

2. **MinIO (S3 API-compatible storage)**
   - The secret assumes MinIO is available at `host.docker.internal:9000`
   - You can run MinIO using Docker: 
     ```bash
     docker run -d --name minio -p 9000:9000 -p 9001:9001 -e MINIO_ROOT_USER=minioadmin -e MINIO_ROOT_PASSWORD=minioadmin minio/minio server /data --console-address ":9001"
     ```
   - Create a bucket named `static` with the MinIO console at http://localhost:9001/

3. **Mail Service (for development)**
   - The secret assumes MailHog is available at `host.docker.internal:1025`
   - You can run MailHog using Docker: 
     ```bash
     docker run -d --name mailhog -p 1025:1025 -p 8025:8025 mailhog/mailhog
     ```
   - Access the mail UI at http://localhost:8025/

## Cleaning Up

To remove the deployment:

```bash
kubectl delete -f k8s/yuzu-service.yaml
kubectl delete -f k8s/yuzu-deployment.yaml
kubectl delete -f k8s/yuzu-secrets.yaml
```

## Production Considerations

For production deployment, consider the following adjustments:

1. Use a managed Kubernetes service (AKS, EKS, GKE) or a properly configured cluster
2. Set up proper TLS/SSL with cert-manager or a similar solution
3. Use Kubernetes StatefulSets for databases instead of external connections
4. Implement proper monitoring and logging with Prometheus, Grafana, etc.
5. Use a CI/CD pipeline to automate builds and deployments
6. Set resource limits appropriate for your production workload
7. Use a proper domain name with DNS configuration instead of host file entries