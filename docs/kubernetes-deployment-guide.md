# Kubernetes Deployment Guide

This guide explains how to deploy the Yuzu application on Kubernetes.

## Prerequisites

- Kubernetes cluster (AKS, GKE, EKS, or other)
- `kubectl` CLI configured to access your cluster
- Docker registry (to store your container images)
- Container image for Yuzu application

## 1. Create a Kubernetes Secret

First, create a Kubernetes secret containing all sensitive configuration values:

```bash
kubectl create secret generic yuzu-app-secrets \
  --from-literal=S3Settings__AccessKey='your-s3-access-key' \
  --from-literal=S3Settings__SecretKey='your-s3-secret-key' \
  --from-literal=S3Settings__ServiceUrl='your-s3-service-url' \
  --from-literal=S3Settings__BucketName='your-bucket-name' \
  --from-literal=DataStorageConfig__ConnectionString='Host=your-postgres-host;Database=yuzu;Username=your-user;Password=your-password' \
  --from-literal=PaymentConfig__Stripe__SecretKey='your-stripe-secret-key' \
  --from-literal=PaymentConfig__Stripe__PublishableKey='your-stripe-publishable-key' \
  --from-literal=MailConnectionConfig__smtpServer='your-smtp-server' \
  --from-literal=MailConnectionConfig__smtpUsername='your-smtp-username' \
  --from-literal=MailConnectionConfig__smtpPassword='your-smtp-password'
```

> **Note**: The app automatically detects when it's running in Kubernetes and will load configuration from this secret.

## 2. Deploy the Application

Create a deployment file named `yuzu-deployment.yaml`:

```yaml
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
        image: your-registry/yuzu-web:latest
        ports:
        - containerPort: 80
        - containerPort: 443
        env:
        - name: ASPNETCORE_ENVIRONMENT
          value: "Production"
        - name: ASPNETCORE_URLS
          value: "http://+:80;https://+:443"
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: yuzu-web-service
spec:
  selector:
    app: yuzu-web
  ports:
  - name: http
    port: 80
    targetPort: 80
  - name: https
    port: 443
    targetPort: 443
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: yuzu-web-ingress
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - your-domain.com
    secretName: yuzu-tls
  rules:
  - host: your-domain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: yuzu-web-service
            port:
              number: 80
```

Apply the configuration:

```bash
kubectl apply -f yuzu-deployment.yaml
```

## 3. Monitor the Deployment

Check if your pods are running:

```bash
kubectl get pods -l app=yuzu-web
```

View logs for any issues:

```bash
kubectl logs -f deployment/yuzu-web
```

Check deployment status:

```bash
kubectl get deployment yuzu-web
```

## 4. Troubleshooting

If the application is not starting correctly, check:

1. Pod logs for detailed errors:
   ```bash
   kubectl logs -f <pod-name>
   ```

2. Verify the secret is mounted correctly:
   ```bash
   kubectl describe pod <pod-name>
   ```

3. Ensure the database is accessible from the Kubernetes cluster.

4. Check if the secret contains all required configuration entries:
   ```bash
   kubectl describe secret yuzu-app-secrets
   ```

## 5. Scaling

To scale the deployment:

```bash
kubectl scale deployment yuzu-web --replicas=3
```