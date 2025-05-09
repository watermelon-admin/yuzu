# Security Considerations for Yuzu Kubernetes Deployment

## Overview
This document details the security measures implemented in the Yuzu Kubernetes deployment and explains why each measure is important.

## Network Security

### 1. SSL/TLS Configuration
- **What**: All traffic is encrypted using TLS 1.2/1.3
- **Why**: Prevents man-in-the-middle attacks and data interception
- **Implementation**: 
  - Wildcard certificate for *.breakscreen.com
  - Automatic HTTP to HTTPS redirection
  - Secure key storage in Kubernetes secrets

### 2. Load Balancer Security
- **What**: Scaleway Load Balancer with ProxyProtocol v2
- **Why**: 
  - Preserves client IP addresses
  - Prevents IP spoofing
  - Enables proper logging and tracking
- **Implementation**:
  ```yaml
  service.beta.kubernetes.io/scw-loadbalancer-proxy-protocol-v2: "1"
  ```

### 3. Internal Network Isolation
- **What**: Services not exposed directly to internet
- **Why**: Reduces attack surface
- **Implementation**:
  - ClusterIP services instead of NodePort
  - Traffic flows through Traefik only

## Container Security

### 1. Non-Root Container
- **What**: Application runs as non-root user
- **Why**: Limits potential damage from container breakout
- **Implementation**:
  ```yaml
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
  ```

### 2. Resource Limits
- **What**: CPU and memory limits
- **Why**: Prevents DoS via resource exhaustion
- **Implementation**:
  ```yaml
  resources:
    limits:
      cpu: "1"
      memory: "1Gi"
    requests:
      cpu: "200m"
      memory: "512Mi"
  ```

### 3. Health Checks
- **What**: Liveness and readiness probes
- **Why**: Ensures automatic recovery from failures
- **Implementation**:
  ```yaml
  livenessProbe:
    httpGet:
      path: /health
      port: 8080
  ```

## Secret Management

### 1. Certificate Storage
- **What**: SSL certificates stored as Kubernetes secrets
- **Why**: Secure storage with encryption at rest
- **Implementation**:
  ```bash
  kubectl create secret tls breakscreen-tls --cert=cert.pem --key=key.pem
  ```

### 2. Registry Credentials
- **What**: Private registry authentication
- **Why**: Prevents unauthorized image access
- **Implementation**:
  ```bash
  kubectl create secret docker-registry scaleway-registry-credentials
  ```

### 3. Application Secrets
- **What**: Environment variables from secrets
- **Why**: Separates sensitive data from code
- **Implementation**:
  ```yaml
  envFrom:
    - secretRef:
        name: yuzu-app-secrets
  ```

## Access Control

### 1. RBAC Configuration
- **What**: Role-Based Access Control
- **Why**: Principle of least privilege
- **Implementation**:
  - Service accounts with minimal permissions
  - Namespace isolation

### 2. Network Policies
- **What**: Kubernetes network policies
- **Why**: Network-level pod isolation
- **Implementation**: 
  - Restrict pod-to-pod communication
  - Allow only necessary traffic flows

## Monitoring and Auditing

### 1. Logging
- **What**: Centralized logging
- **Why**: Security event detection and auditing
- **Components**:
  - Application logs
  - Traefik access logs
  - Kubernetes audit logs

### 2. Metrics
- **What**: Performance and security metrics
- **Why**: Detect anomalies and attacks
- **Components**:
  - Traefik metrics
  - Kubernetes metrics
  - Application metrics

## Security Checklist

Before deployment:
- [ ] All secrets are properly configured
- [ ] TLS certificate is valid and secure
- [ ] Resource limits are set
- [ ] Non-root user is configured
- [ ] Health checks are implemented
- [ ] Network policies are in place
- [ ] RBAC is properly configured
- [ ] Logging is enabled and configured
- [ ] Image scanning is implemented
- [ ] Security updates are automated

## Security Best Practices

1. **Regular Updates**
   - Keep Kubernetes version current
   - Update Traefik regularly
   - Update application dependencies

2. **Monitoring**
   - Set up alerts for security events
   - Monitor resource usage
   - Track access patterns

3. **Backup and Recovery**
   - Regular secret backups
   - Certificate backup procedure
   - Disaster recovery plan

## Emergency Procedures

1. **Certificate Compromise**
   ```bash
   # Rotate certificate
   kubectl delete secret breakscreen-tls
   kubectl create secret tls breakscreen-tls --cert=new-cert.pem --key=new-key.pem
   ```

2. **Pod Compromise**
   ```bash
   # Isolate pod
   kubectl delete pod <pod-name>
   # Review logs
   kubectl logs <pod-name> --previous
   ```

3. **Network Attack**
   ```bash
   # Apply restrictive network policy
   kubectl apply -f emergency-netpol.yaml
   ```

## Further Reading

- [Kubernetes Security Best Practices](https://kubernetes.io/docs/concepts/security/overview/)
- [Traefik Security](https://doc.traefik.io/traefik/v2.0/security/)
- [Container Security](https://docs.docker.com/engine/security/)
- [Scaleway Security](https://www.scaleway.com/en/docs/faq/kubernetes-kapsule/#security)

