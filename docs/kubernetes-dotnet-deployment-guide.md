# Kubernetes .NET Application Deployment Guide

This document provides guidance for deploying .NET applications in Kubernetes with proper configuration, based on lessons learned from troubleshooting deployment issues.

## Port Configuration Best Practices

### Non-root Port Binding

In Kubernetes containers, non-root users cannot bind to ports below 1024 due to Linux security restrictions. Instead of using port 80 directly:

1. Configure your .NET application to listen on a higher port (e.g., 8080):
   ```yaml
   env:
   - name: ASPNETCORE_URLS
     value: "http://+:8080"
   ```

2. Ensure the `containerPort` matches this port:
   ```yaml
   ports:
   - containerPort: 8080
   ```

3. Configure your service to map external port 80 to your container's port:
   ```yaml
   ports:
   - port: 80          # External port
     targetPort: 8080  # Container port
     protocol: TCP
     name: http
   ```

### Health Probes

Make sure health probe ports match your application port:

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8080  # Must match container listening port
readinessProbe:
  httpGet:
    path: /health
    port: 8080  # Must match container listening port
```

## Kubernetes API Access

For applications that need to access the Kubernetes API (e.g., for secrets):

1. Ensure proper environment variables:
   ```yaml
   env:
   - name: KUBERNETES_SERVICE_HOST
     value: "kubernetes.default.svc"
   - name: KUBERNETES_SERVICE_PORT
     value: "443"
   ```

2. Configure a service account with appropriate permissions.

3. Mount the service account token:
   ```yaml
   volumes:
   - name: sa-token
     projected:
       sources:
       - serviceAccountToken:
           path: token
   ```

## Service and Ingress Configuration

Proper network flow configuration:
- External traffic → Ingress (port 80) → Service (port 80) → Pod (container port 8080)

Example service configuration:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: app-name
spec:
  type: ClusterIP
  ports:
  - port: 80
    targetPort: 8080
    protocol: TCP
    name: http
  selector:
    app: app-name
```

Example ingress configuration:
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
spec:
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-name
            port:
              number: 80
```

## Common Issues and Solutions

### Permission Denied Error

**Error**: `System.Net.Sockets.SocketException (13): Permission denied`

**Solution**:
- Use a port number higher than 1024 (e.g., 8080)
- Update ASPNETCORE_URLS to match this port
- Update container, service and probe port configurations accordingly

### Kubernetes API Connection Error

**Error**: `Name or service not known (true:443)`

**Solution**:
- Set KUBERNETES_SERVICE_HOST to "kubernetes.default.svc"
- Set KUBERNETES_SERVICE_PORT to "443"

### Health Probe Failure

**Error**: `Readiness probe failed: connection refused`

**Solution**:
- Make sure health probe port matches the application's listening port

### Bad Gateway or Service Unavailable

**Solution**:
- Ensure service targetPort matches containerPort
- Check that application is actually listening on the expected port
- Verify network policy allows traffic flow

## ArgoCD Deployment Tips

When deploying with ArgoCD:

1. If a deployment is stuck in a failed state:
   ```
   kubectl rollout restart deployment <deployment-name>
   ```

2. Force refresh an ArgoCD application:
   ```
   argocd app sync <app-name> --force
   ```

3. For troubleshooting, check pod logs:
   ```
   kubectl logs -f <pod-name>
   ```

## Best Practices

1. Use health checks to ensure application readiness
2. Configure resource limits appropriately
3. Use namespaces for logical separation
4. Secure secrets properly (use Kubernetes secrets)
5. Set appropriate liveness and readiness probe parameters
6. Include proper logging configuration