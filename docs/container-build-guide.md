# Building and Verifying a Container for Yuzu Application

This guide explains how to build a Docker container for the Yuzu application and verify it works with the Kubernetes deployment.

## Prerequisites

- Docker installed on your development machine
- .NET SDK 9.0 or later
- Node.js and npm (for TypeScript compilation)
- Docker registry access (e.g., Docker Hub, GitHub Container Registry, or Scaleway Container Registry)

## Creating a Dockerfile

First, create a `Dockerfile` in the root directory of the project:

```bash
cat > Dockerfile << 'EOF'
# Build stage
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Install Node.js for TypeScript compilation
RUN apt-get update && \
    apt-get install -y --no-install-recommends nodejs npm && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy solution and project files
COPY *.sln ./
COPY Yuzu.AppHost/*.csproj ./Yuzu.AppHost/
COPY Yuzu.Configuration/*.csproj ./Yuzu.Configuration/
COPY Yuzu.Data/*.csproj ./Yuzu.Data/
COPY Yuzu.Mail/*.csproj ./Yuzu.Mail/
COPY Yuzu.Payments/*.csproj ./Yuzu.Payments/
COPY Yuzu.ServiceDefaults/*.csproj ./Yuzu.ServiceDefaults/
COPY Yuzu.Time/*.csproj ./Yuzu.Time/
COPY Yuzu.Web/*.csproj ./Yuzu.Web/

# Restore dependencies
RUN dotnet restore

# Copy the rest of the code
COPY . .

# Build TypeScript
WORKDIR /src/Yuzu.Web
RUN npm install
RUN npm run build

# Build and publish the .NET app
WORKDIR /src
RUN dotnet build "Yuzu.Web/Yuzu.Web.csproj" -c Release -o /app/build
RUN dotnet publish "Yuzu.Web/Yuzu.Web.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app

# Create non-root user for security
RUN groupadd -g 1000 dotnetuser && \
    useradd -m -u 1000 -g dotnetuser dotnetuser

# Set proper permissions
RUN mkdir -p /app && chown -R dotnetuser:dotnetuser /app

# Copy published files from build stage
COPY --from=build --chown=dotnetuser:dotnetuser /app/publish .

# Set environment variables
ENV ASPNETCORE_URLS=http://+:80
ENV ASPNETCORE_ENVIRONMENT=Production

# Switch to non-root user
USER dotnetuser

EXPOSE 80
ENTRYPOINT ["dotnet", "Yuzu.Web.dll"]
EOF
```

This Dockerfile uses a multi-stage build approach:
1. The build stage compiles both the TypeScript assets and .NET code
2. The runtime stage includes only what's needed for production, making the final image smaller

## Building the Container Image

Build the Docker image with a tag:

```bash
docker build -t yourusername/yuzu:latest .
```

Replace `yourusername` with your Docker registry username.

## Testing the Container Locally

Before deploying to Kubernetes, test the container locally:

```bash
# Create a network for the containers
docker network create yuzu-network

# Run PostgreSQL container
docker run -d --name yuzu-postgres \
  --network yuzu-network \
  -e POSTGRES_USER=yuzu \
  -e POSTGRES_PASSWORD=yourpassword \
  -e POSTGRES_DB=yuzu \
  -p 5432:5432 \
  postgres:14

# Run the Yuzu application container
docker run -d --name yuzu-web \
  --network yuzu-network \
  -e DataStorageConfig__ConnectionString="Host=yuzu-postgres;Database=yuzu;Username=yuzu;Password=yourpassword" \
  -e S3Settings__ServiceUrl="https://s3.fr-par.scw.cloud" \
  -e S3Settings__BucketName="your-bucket-name" \
  -e S3Settings__AccessKey="your-access-key" \
  -e S3Settings__SecretKey="your-secret-key" \
  -p 8080:80 \
  yourusername/yuzu:latest
```

Verify the application is running:

```bash
# Check container logs
docker logs yuzu-web

# Access the application in your browser
open http://localhost:8080
```

## Publishing the Container Image

Push the image to your container registry:

```bash
# Log in to your Docker registry
docker login

# Push the image
docker push yourusername/yuzu:latest
```

For Scaleway Container Registry:

```bash
# Log in to Scaleway Container Registry
docker login rg.fr-par.scw.cloud -u nologin -p $SCW_SECRET_KEY

# Tag the image for Scaleway
docker tag yourusername/yuzu:latest rg.fr-par.scw.cloud/your-namespace/yuzu:latest

# Push the image
docker push rg.fr-par.scw.cloud/your-namespace/yuzu:latest
```

## Verifying the Container Works with Kubernetes

After deploying your container to a registry, update your Kubernetes deployment file:

```bash
# Update the image field in yuzu-deployment.yaml
cat > yuzu-deployment.yaml << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: yuzu-web
  labels:
    app: yuzu-web
spec:
  replicas: 2
  selector:
    matchLabels:
      app: yuzu-web
  template:
    metadata:
      labels:
        app: yuzu-web
    spec:
      containers:
      - name: yuzu-web
        image: yourusername/yuzu:latest  # Use your registry image path here
        ports:
        - containerPort: 80
        env:
        - name: ASPNETCORE_ENVIRONMENT
          value: "Production"
        - name: DataStorageConfig__ConnectionString
          valueFrom:
            secretKeyRef:
              name: yuzu-app-secrets
              key: DataStorageConfig__ConnectionString
        - name: S3Settings__ServiceUrl
          valueFrom:
            secretKeyRef:
              name: yuzu-app-secrets
              key: S3Settings__ServiceUrl
        - name: S3Settings__BucketName
          valueFrom:
            secretKeyRef:
              name: yuzu-app-secrets
              key: S3Settings__BucketName
        - name: S3Settings__AccessKey
          valueFrom:
            secretKeyRef:
              name: yuzu-app-secrets
              key: S3Settings__AccessKey
        - name: S3Settings__SecretKey
          valueFrom:
            secretKeyRef:
              name: yuzu-app-secrets
              key: S3Settings__SecretKey
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        readinessProbe:
          httpGet:
            path: /health
            port: 80
          initialDelaySeconds: 30
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: /alive
            port: 80
          initialDelaySeconds: 30
          periodSeconds: 20
EOF
```

## Step-by-Step Verification

1. Deploy the application to Kubernetes:

```bash
kubectl apply -f yuzu-deployment.yaml
```

2. Check the pod status:

```bash
kubectl get pods -l app=yuzu-web
```

3. Check pod logs for any issues:

```bash
kubectl logs -f deployment/yuzu-web
```

4. Verify the application can access the database:

```bash
# Forward the pod's port to your local machine
kubectl port-forward deployment/yuzu-web 8080:80
```

5. Access the application in your browser at `http://localhost:8080`

6. Check integration with Traefik:

```bash
kubectl get ingressroute yuzu-route
```

7. Access the application through your domain:

```bash
curl -I https://yuzu.yourdomain.com
```

## Troubleshooting Container Issues

If you encounter issues with the container:

### Database Connection Problems

Check database connectivity:

```bash
kubectl exec -it $(kubectl get pods -l app=yuzu-web -o name | head -n 1) -- bash
apt-get update && apt-get install -y netcat
nc -zv postgres 5432
```

### S3 Storage Connectivity Issues

Verify S3 settings within the container:

```bash
kubectl exec -it $(kubectl get pods -l app=yuzu-web -o name | head -n 1) -- bash
apt-get update && apt-get install -y curl
curl -I $S3_SERVICE_URL
```

### Image Pull Errors

If pods can't pull the image:

```bash
# Check if the image exists in your registry
docker pull yourusername/yuzu:latest

# Check for authentication issues
kubectl create secret docker-registry regcred \
  --docker-server=<your-registry-server> \
  --docker-username=<your-username> \
  --docker-password=<your-password>

# Update deployment to use the secret
kubectl patch serviceaccount default -p '{"imagePullSecrets": [{"name": "regcred"}]}'
```

## Best Practices for Container Production Readiness

1. **Container Scanning**: Scan your container for vulnerabilities:
   ```bash
   docker scan yourusername/yuzu:latest
   ```

2. **Non-root User**: The Dockerfile already uses a non-root user for security.

3. **Resource Limits**: The deployment has resource requests and limits defined.

4. **Health Checks**: Readiness and liveness probes are configured in the deployment.

5. **Image Tagging**: Use specific versions instead of `latest`:
   ```bash
   docker build -t yourusername/yuzu:1.0.0 .
   ```

6. **Container Registry**: For production, prefer a private container registry.

7. **Secrets Management**: Use Kubernetes secrets for sensitive information.

8. **Logging**: Configure proper logging for the container:
   ```bash
   kubectl apply -f - <<EOF
   apiVersion: v1
   kind: ConfigMap
   metadata:
     name: logging-config
   data:
     appsettings.Production.json: |
       {
         "Logging": {
           "LogLevel": {
             "Default": "Information",
             "Microsoft": "Warning",
             "Microsoft.Hosting.Lifetime": "Information"
           }
         }
       }
   EOF
   ```