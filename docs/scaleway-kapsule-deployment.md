# Deploying Yuzu on Scaleway Kapsule

This guide explains how to deploy the Yuzu application on a Scaleway Kapsule Kubernetes cluster with Traefik as the ingress controller and wildcard certificates.

## Prerequisites

- Scaleway account with access to Kapsule
- `kubectl` CLI installed and configured to access your cluster
- `helm` CLI installed for Traefik deployment
- Domain name for accessing your application
- Docker registry access for container images

## 1. Setting Up a Scaleway Kapsule Cluster

### Creating a Kapsule Cluster

1. Log in to your Scaleway console: https://console.scaleway.com
2. Navigate to Kubernetes > Clusters
3. Click "Create a Kubernetes Cluster"
4. Select your region (e.g., fr-par)
5. Choose Kubernetes version (recommended: 1.28 or newer)
6. Configure your node pools:
   - Select an instance type (at least DEV1-M for production)
   - Set the number of nodes (minimum 2 for high availability)
   - Select the auto-scaling options if needed
7. Configure networking options:
   - Keep default CNI (Cilium or Calico)
   - Enable auto-allocation of IPv4/IPv6 addresses
8. Click "Create Cluster"

### Connecting to Your Cluster

After your cluster is created, download the kubeconfig file from the Scaleway console:

1. Click on your newly created cluster
2. Click "Download kubeconfig"
3. Configure kubectl to use this config:

```bash
export KUBECONFIG=/path/to/downloaded/kubeconfig.yaml
# Verify connection
kubectl get nodes
```

## 2. Installing Traefik Ingress Controller

### Install Traefik using Helm

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

### Verify Traefik Installation

```bash
kubectl get pods -n traefik
kubectl get svc -n traefik
```

Record the external IP assigned to the Traefik service.

## 3. Setting Up Wildcard Certificates with Let's Encrypt

### Install cert-manager

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.2/cert-manager.yaml

# Wait for pods to be ready
kubectl wait --for=condition=ready pod -l app.kubernetes.io/instance=cert-manager -n cert-manager
```

### Create ClusterIssuer for Let's Encrypt

Create a ClusterIssuer to obtain certificates:

```bash
cat > cluster-issuer.yaml << EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    email: your-email@example.com
    server: https://acme-v02.api.letsencrypt.org/directory
    privateKeySecretRef:
      name: letsencrypt-prod-account-key
    solvers:
    - http01:
        ingress:
          class: traefik
EOF

kubectl apply -f cluster-issuer.yaml
```

### Create Wildcard Certificate

```bash
cat > wildcard-cert.yaml << EOF
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: wildcard-yourdomain-cert
  namespace: default
spec:
  secretName: wildcard-yourdomain-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - yourdomain.com
  - "*.yourdomain.com"
  usages:
  - digital signature
  - key encipherment
  - server auth
EOF

kubectl apply -f wildcard-cert.yaml
```

> **Note**: For wildcard certificates with Let's Encrypt, you'll need to use DNS-01 challenge instead of HTTP-01. This requires additional configuration with your DNS provider.

## 4. Create Kubernetes Secrets for Yuzu

```bash
kubectl create secret generic yuzu-app-secrets \
  --from-literal=S3Settings__AccessKey='your-s3-access-key' \
  --from-literal=S3Settings__SecretKey='your-s3-secret-key' \
  --from-literal=S3Settings__ServiceUrl='https://s3.fr-par.scw.cloud' \
  --from-literal=S3Settings__BucketName='your-bucket-name' \
  --from-literal=DataStorageConfig__ConnectionString='Host=postgres;Database=yuzu;Username=yuzu;Password=your-password' \
  --from-literal=PaymentConfig__Stripe__SecretKey='your-stripe-secret-key' \
  --from-literal=PaymentConfig__Stripe__PublishableKey='your-stripe-publishable-key' \
  --from-literal=MailConnectionConfig__smtpServer='smtp.yourdomain.com' \
  --from-literal=MailConnectionConfig__smtpUsername='your-smtp-username' \
  --from-literal=MailConnectionConfig__smtpPassword='your-smtp-password' \
  --from-literal=POSTGRES_PASSWORD='your-postgres-password'
```

## 5. Deploy PostgreSQL

```bash
cat > postgres-deployment.yaml << EOF
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:14
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_USER
          value: "yuzu"
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: yuzu-app-secrets
              key: POSTGRES_PASSWORD
        - name: POSTGRES_DB
          value: "yuzu"
        volumeMounts:
        - name: postgres-data
          mountPath: /var/lib/postgresql/data
          subPath: postgres
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        readinessProbe:
          exec:
            command: ["pg_isready", "-U", "yuzu"]
          initialDelaySeconds: 5
          periodSeconds: 10
        livenessProbe:
          exec:
            command: ["pg_isready", "-U", "yuzu"]
          initialDelaySeconds: 30
          periodSeconds: 20
  volumeClaimTemplates:
  - metadata:
      name: postgres-data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
  clusterIP: None
EOF

kubectl apply -f postgres-deployment.yaml
```

## 6. Deploy Yuzu Application

Create a deployment file for Yuzu:

```bash
cat > yuzu-deployment.yaml << EOF
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
        env:
        - name: ASPNETCORE_ENVIRONMENT
          value: "Production"
        - name: ASPNETCORE_URLS
          value: "http://+:80"
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
---
apiVersion: v1
kind: Service
metadata:
  name: yuzu-web-service
spec:
  selector:
    app: yuzu-web
  ports:
  - port: 80
    targetPort: 80
  type: ClusterIP
EOF

kubectl apply -f yuzu-deployment.yaml
```

## 7. Configure Traefik Ingress for Your Application

Create an IngressRoute for your application:

```bash
cat > yuzu-ingress-route.yaml << EOF
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: yuzu-route
spec:
  entryPoints:
    - websecure
  routes:
  - match: Host(\`yuzu.yourdomain.com\`)
    kind: Rule
    services:
    - name: yuzu-web-service
      port: 80
  tls:
    secretName: wildcard-yourdomain-tls
EOF

kubectl apply -f yuzu-ingress-route.yaml
```

## 8. Configure DNS

1. Get the IP address of the Traefik LoadBalancer:
   ```bash
   kubectl get svc -n traefik traefik -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
   ```

2. Add DNS records at your domain provider:
   - Set an A record for `yuzu.yourdomain.com` pointing to the Traefik LoadBalancer IP

## 9. Verify Deployment

1. Check pods are running:
   ```bash
   kubectl get pods
   ```

2. Check the ingress is properly configured:
   ```bash
   kubectl get ingressroute
   ```

3. Visit your site at `https://yuzu.yourdomain.com`

## 10. Setting Up Auto-scaling

To enable horizontal pod autoscaling:

```bash
cat > yuzu-hpa.yaml << EOF
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: yuzu-web-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: yuzu-web
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
EOF

kubectl apply -f yuzu-hpa.yaml
```

## Troubleshooting

### Check Traefik Logs

```bash
kubectl logs -f -n traefik $(kubectl get pods -n traefik -l app.kubernetes.io/name=traefik -o jsonpath='{.items[0].metadata.name}')
```

### Check Certificate Status

```bash
kubectl describe certificate wildcard-yourdomain-cert
```

### Check Yuzu Application Logs

```bash
kubectl logs -f deployment/yuzu-web
```