# Kubernetes Database Setup for Yuzu

This guide explains how to set up a PostgreSQL database for the Yuzu application using Kubernetes.

## Setting Up PostgreSQL in Kubernetes

While you can use a managed PostgreSQL service (like Azure Database for PostgreSQL or Amazon RDS), this guide shows how to deploy PostgreSQL within Kubernetes.

### 1. Create a PostgreSQL StatefulSet

Create a file named `postgres-statefulset.yaml`:

```yaml
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
          value: devuser
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: yuzu-app-secrets
              key: POSTGRES_PASSWORD
        - name: POSTGRES_DB
          value: yuzu
        volumeMounts:
        - name: postgres-data
          mountPath: /var/lib/postgresql/data
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
```

Apply this configuration:

```bash
kubectl apply -f postgres-statefulset.yaml
```

### 2. Create a Database Password Secret

If you haven't already included the database password in the main secret, create it:

```bash
kubectl create secret generic postgres-credentials \
  --from-literal=POSTGRES_PASSWORD='your-secure-password'
```

### 3. Verify PostgreSQL is Running

Check if the PostgreSQL pod is running:

```bash
kubectl get pods -l app=postgres
```

### 4. Configure Application Connection String

Make sure your application's connection string in the `yuzu-app-secrets` secret is properly configured to connect to the PostgreSQL service:

```
DataStorageConfig__ConnectionString=Host=postgres;Database=yuzu;Username=devuser;Password=your-secure-password
```

Note: Use the service name `postgres` as the host in the connection string. Kubernetes DNS will resolve this to the appropriate pod.

## Backup and Restore

### Creating a Database Backup

```bash
# Connect to the PostgreSQL pod
kubectl exec -it postgres-0 -- bash

# Create a backup
pg_dump -U devuser -d yuzu > /tmp/yuzu-backup.sql

# Exit the pod
exit

# Copy the backup to your local machine
kubectl cp postgres-0:/tmp/yuzu-backup.sql ./yuzu-backup.sql
```

### Restoring from a Backup

```bash
# Copy backup file to the pod
kubectl cp ./yuzu-backup.sql postgres-0:/tmp/yuzu-backup.sql

# Connect to the PostgreSQL pod
kubectl exec -it postgres-0 -- bash

# Restore the database
psql -U devuser -d yuzu < /tmp/yuzu-backup.sql

# Exit the pod
exit
```

## Database Migrations

The Yuzu application handles database migrations automatically when it starts up. The application:

1. Checks if the database exists and creates it if necessary
2. Ensures all tables are created using Entity Framework's `EnsureCreatedAsync()`
3. Initializes default data if the database was newly created

No manual migration steps are required when deploying a new version of the application.

## Production Considerations

For production environments, consider:

1. Using a managed PostgreSQL service instead of running in Kubernetes
2. Setting up proper backup procedures
3. Configuring high availability if needed
4. Setting resource limits appropriate for your workload
5. Implementing proper monitoring for your database
6. Setting up a maintenance window for database updates