# Troubleshooting Guide for Yuzu Kubernetes Deployment

## Table of Contents
1. [Common Issues](#common-issues)
2. [Diagnostic Commands](#diagnostic-commands)
3. [Component-Specific Troubleshooting](#component-specific-troubleshooting)
4. [Recovery Procedures](#recovery-procedures)

## Common Issues

### 1. Image Pull Errors

**Symptoms:**
- Pod stuck in "ImagePullBackOff" or "ErrImagePull" state
- Error message about authentication or missing image

**Solution:**
1. Verify registry credentials:
```bash
kubectl get secret scaleway-registry-credentials
kubectl get secret scaleway-registry-credentials -o yaml
```

2. Check image name and tag:
```bash
kubectl describe pod <pod-name>
```

3. Recreate registry secret:
```bash
kubectl delete secret scaleway-registry-credentials
kubectl create secret docker-registry scaleway-registry-credentials \
  --docker-server=rg.fr-par.scw.cloud \
  --docker-username=$SCW_REGISTRY_NAMESPACE \
  --docker-password=$SCW_SECRET_KEY
```

### 2. SSL/TLS Issues

**Symptoms:**
- Certificate errors in browser
- Traefik logs showing TLS errors
- HTTPS not working

**Solution:**
1. Verify certificate secret:
```bash
kubectl get secret breakscreen-tls
kubectl describe secret breakscreen-tls
```

2. Check Traefik TLS configuration:
```bash
kubectl get ingress yuzu-web -o yaml
kubectl logs -n traefik pod/traefik-d67d5d47d-fnx55
```

3. Verify certificate content:
```bash
kubectl get secret breakscreen-tls -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -text
```

### 3. LoadBalancer Issues

**Symptoms:**
- External IP showing as <pending>
- Unable to access application
- Network timeouts

**Solution:**
1. Check LoadBalancer status:
```bash
kubectl get service -n traefik traefik
kubectl describe service -n traefik traefik
```

2. Verify Scaleway configuration:
```bash
kubectl get service -n traefik traefik -o yaml
```

3. Check for events:
```bash
kubectl get events -n traefik
```

### 4. Application Health Check Failures

**Symptoms:**
- Pod restarting frequently
- Readiness/Liveness probe failures
- CrashLoopBackOff status

**Solution:**
1. Check probe configuration:
```bash
kubectl describe pod <pod-name>
```

2. Verify application logs:
```bash
kubectl logs <pod-name>
kubectl logs <pod-name> --previous  # If container has restarted
```

3. Test health endpoint directly:
```bash
kubectl exec -it <pod-name> -- curl localhost:8080/health
```

## Diagnostic Commands

### Network Connectivity
```bash
# Test service DNS resolution
kubectl run -it --rm --restart=Never debug --image=busybox -- nslookup yuzu-web

# Test connection to service
kubectl run -it --rm --restart=Never debug --image=curlimages/curl -- curl http://yuzu-web

# Check ingress controller logs
kubectl logs -n traefik -l app.kubernetes.io/name=traefik --tail=100
```

### Resource Usage
```bash
# Check pod resource usage
kubectl top pod

# Check node resource usage
kubectl top node

# Get detailed pod metrics
kubectl describe pod <pod-name> | grep -A 10 "Resource"
```

### Configuration Verification
```bash
# Check all resources in namespace
kubectl get all

# Dump full configuration
kubectl get configmap,secret,service,deployment,ingress -o yaml > cluster-dump.yaml

# Verify ingress configuration
kubectl describe ingress yuzu-web
```

## Component-Specific Troubleshooting

### 1. Traefik Issues

**Check Traefik status:**
```bash
# Get Traefik pods
kubectl get pods -n traefik

# Check Traefik logs
kubectl logs -n traefik <traefik-pod-name>

# Verify Traefik configuration
kubectl get cm -n traefik
```

### 2. Database Connectivity

**Verify database access:**
```bash
# Check environment variables
kubectl exec -it <pod-name> -- env | grep DB_

# Test database connection
kubectl exec -it <pod-name> -- nc -zv <db-host> 5432
```

### 3. Secret Management

**Verify secrets:**
```bash
# List all secrets
kubectl get secrets

# Check secret contents (base64 encoded)
kubectl get secret yuzu-app-secrets -o yaml

# Verify secret mounting
kubectl describe pod <pod-name> | grep -A 5 "Environment"
```

## Recovery Procedures

### 1. Pod Recovery
```bash
# Force pod recreation
kubectl delete pod <pod-name>

# Scale down/up deployment
kubectl scale deployment yuzu-web --replicas=0
kubectl scale deployment yuzu-web --replicas=1
```

### 2. Deployment Rollback
```bash
# List deployment history
kubectl rollout history deployment yuzu-web

# Rollback to previous version
kubectl rollout undo deployment yuzu-web

# Rollback to specific version
kubectl rollout undo deployment yuzu-web --to-revision=<revision>
```

### 3. Certificate Renewal
```bash
# Delete old certificate
kubectl delete secret breakscreen-tls

# Create new certificate secret
kubectl create secret tls breakscreen-tls \
  --cert=new-cert.pem \
  --key=new-key.pem
```

## Monitoring and Debugging Tools

### 1. Port Forwarding
```bash
# Forward Traefik dashboard
kubectl port-forward -n traefik pod/traefik-d67d5d47d-fnx55 9000:9000

# Forward application port
kubectl port-forward service/yuzu-web 8080:80
```

### 2. Debug Container
```bash
# Run debug pod
kubectl run debug --rm -i --tty --image=nicolaka/netshoot -- /bin/bash
```

### 3. Log Analysis
```bash
# Get application logs
kubectl logs -f deployment/yuzu-web

# Get all container logs
kubectl logs -f deployment/yuzu-web --all-containers=true

# Get previous container logs
kubectl logs -f deployment/yuzu-web --previous
```

## Performance Issues

### 1. High CPU/Memory Usage
- Check resource metrics
- Review application logs for bottlenecks
- Verify resource limits and requests

### 2. Slow Response Times
- Check network latency
- Verify LoadBalancer health
- Review Traefik metrics

### 3. Connection Issues
- Verify DNS resolution
- Check network policies
- Review service endpoints

## Additional Resources

- [Kubernetes Debugging](https://kubernetes.io/docs/tasks/debug-application-cluster/debug-application/)
- [Traefik Debugging](https://doc.traefik.io/traefik/observability/logs/)
- [Scaleway Status Page](https://status.scaleway.com/)

