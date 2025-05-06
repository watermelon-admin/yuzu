# Deploying Yuzu on Scaleway Kapsule with Existing Wildcard Certificate

This guide explains how to deploy the Yuzu application on a Scaleway Kapsule Kubernetes cluster using Traefik as the ingress controller with your existing wildcard certificate.

## Prerequisites

- Scaleway account with access to Kapsule
- `kubectl` CLI installed and configured to access your cluster
- `helm` CLI installed for Traefik deployment
- Docker registry access for container images
- Existing wildcard certificate (`.crt`/`.pem` and `.key` files)
- Domain name configured to point to your Kapsule cluster

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
7. Configure networking options
8. Click "Create Cluster"

### Connecting to Your Cluster

After your cluster is created, download the kubeconfig file from the Scaleway console:

```bash
export KUBECONFIG=/path/to/downloaded/kubeconfig.yaml
# Verify connection
kubectl get nodes
```

## 2. Creating a Secret with Your Wildcard Certificate

Upload your existing certificate and key to the cluster as a Kubernetes secret:

```bash
kubectl create secret tls wildcard-yourdomain-tls \
  --cert=/path/to/your/certificate.crt \
  --key=/path/to/your/private-key.key
```

## 3. Installing Traefik Ingress Controller

### Install Traefik using Helm

```bash
# Add Traefik Helm repository
helm repo add traefik https://traefik.github.io/charts
helm repo update

# Create namespace for Traefik
kubectl create namespace traefik

# Create values file for Traefik
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

# TLS store with default certificate
tlsStore:
  default:
    defaultCertificate:
      secretName: wildcard-yourdomain-tls

securityContext:
  capabilities:
    drop: [ALL]
    add: [NET_BIND_SERVICE]
  readOnlyRootFilesystem: true
  runAsGroup: 65532
  runAsNonRoot: true
  runAsUser: 65532
EOF

# Install Traefik
helm install traefik traefik/traefik -n traefik -f traefik-values.yaml
```

### Verify Traefik Installation

```bash
kubectl get pods -n traefik
kubectl get svc -n traefik
```

Record the external IP assigned to the Traefik service.

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

## 7. Configure Traefik IngressRoute for Your Application

Create an IngressRoute referencing your wildcard certificate:

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
    middlewares:
    - name: yuzu-compress
    - name: yuzu-headers
  tls:
    secretName: wildcard-yourdomain-tls
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
EOF

kubectl apply -f yuzu-ingress-route.yaml
```

## 8. Configure DNS

1. Get the IP address of the Traefik LoadBalancer:
   ```bash
   kubectl get svc -n traefik traefik -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
   ```

2. Update your DNS records:
   - Set an A record for `yuzu.yourdomain.com` pointing to the Traefik LoadBalancer IP
   - Ensure your wildcard DNS record (`*.yourdomain.com`) is pointing to the same IP

## 9. Certificate Rotation

When you need to update your certificate:

1. Create a new secret with the updated certificate:

```bash
kubectl create secret tls wildcard-yourdomain-tls \
  --cert=/path/to/your/new-certificate.crt \
  --key=/path/to/your/new-private-key.key \
  --dry-run=client -o yaml | kubectl apply -f -
```

2. Restart Traefik to apply the new certificate:

```bash
kubectl rollout restart deployment traefik -n traefik
```

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

### Verify Certificate is Being Used

```bash
echo | openssl s_client -showcerts -servername yuzu.yourdomain.com -connect yuzu.yourdomain.com:443 2>/dev/null | openssl x509 -inform pem -noout -text
```

### Check Traefik IngressRoute

```bash
kubectl describe ingressroute yuzu-route
```