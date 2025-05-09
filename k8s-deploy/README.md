# Yuzu Web Application Kubernetes Deployment Guide

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Components Explained](#components-explained)
4. [Prerequisites](#prerequisites)
5. [Deployment Steps](#deployment-steps)
6. [Maintenance](#maintenance)
7. [Temporarily Disabling the Application](#temporarily-disabling-the-application)
8. [Troubleshooting](#troubleshooting)

## Overview

This guide documents the deployment of the Yuzu web application on a Scaleway Kubernetes cluster. The setup uses modern cloud-native technologies to ensure reliability, security, and scalability.

## Architecture

The deployment architecture consists of several layers:

```
                                    │
                                    ▼
                              Cloudflare
                                    │
                                    ▼
                            DNS (breakscreen.com)
                                    │
                                    ▼
                         Scaleway Load Balancer
                                    │
                                    ▼
                         Traefik Ingress Controller
                                    │
                                    ▼
                            Yuzu Web Service
                                    │
                                    ▼
                            Yuzu Web Pods
```

## Components Explained

### Kubernetes Basics
Kubernetes is a container orchestration platform that manages containerized applications. Key concepts in our setup:

1. **Pods**: The smallest deployable units in Kubernetes
   - In our case, runs the Yuzu web application container
   - Includes health checks (liveness and readiness probes)
   - Managed by a Deployment controller

2. **Deployments**: Manages the lifecycle of pods
   - Ensures desired number of pods are running
   - Handles rolling updates
   - Maintains application state

3. **Services**: Provides stable networking for pods
   - Acts as an internal load balancer
   - Provides stable DNS name within the cluster
   - Our service type: ClusterIP (internal only)

### Traefik Ingress Controller
Traefik is a modern reverse proxy and load balancer that:

1. **Handles External Traffic**
   - Terminates SSL/TLS
   - Routes traffic to correct services
   - Passes both HTTP and HTTPS traffic to the application

2. **Features We Use**
   - Automatic SSL/TLS handling
   - Path-based routing
   - Load balancing
   - ProxyProtocol support for Scaleway

3. **Configuration Components**
   - `values.yaml`: Helm chart configuration
   - Ingress resources: Traffic routing rules

### Cloudflare Integration
Our setup uses Cloudflare as a proxy for additional security and performance benefits:

1. **Security Features**
   - DDoS protection
   - Web Application Firewall (WAF)
   - Additional TLS encryption
   - Protection against common attacks

2. **Performance Benefits**
   - Global CDN
   - Caching for static assets
   - Optimization for web traffic

### SSL/TLS Configuration
Our setup uses SSL certificates for breakscreen.com:

1. **Certificate Handling**
   - Stored as Kubernetes secret
   - Applied to all HTTPS traffic
   - Cloudflare provides additional encryption

2. **Security Features**
   - TLS 1.2/1.3 support
   - HTTP to HTTPS redirection (handled by the application)
   - Secure headers

### Scaleway Integration

1. **Load Balancer**
   - Provided by Scaleway
   - ProxyProtocol v2 support
   - High availability

2. **Container Registry**
   - Stores application Docker images
   - Secure access via registry credentials
   - Regional location for fast pulls

## Key Configuration Files Explained

### 1. Traefik Configuration (traefik/values.yaml)
```yaml
ports:
  web:
    port: 8000
    exposedPort: 80
    proxyProtocol:
      enabled: true
      trustedIPs: 
        - 0.0.0.0/0
    forwardedHeaders:
      enabled: true
      trustedIPs:
        - 0.0.0.0/0
  websecure:
    port: 8443
    exposedPort: 443
    proxyProtocol:
      enabled: true
      trustedIPs:
        - 0.0.0.0/0
    forwardedHeaders:
      enabled: true
      trustedIPs:
        - 0.0.0.0/0
service:
  type: LoadBalancer
  annotations:
    "service.beta.kubernetes.io/scw-loadbalancer-proxy-protocol-v2": "1"
    "service.beta.kubernetes.io/scw-loadbalancer-use-hostname": "1"
```
- Configures Traefik service type and Scaleway integration
- Enables ProxyProtocol for proper client IP forwarding
- Sets up both HTTP and HTTPS endpoints

### 2. Application Deployment (app/deployment.yaml)
```yaml
spec:
  containers:
    - name: yuzu-web
      image: rg.fr-par.scw.cloud/cr-yuzu-par-1/yuzu-web:latest
      ports:
        - containerPort: 8080  # Internal container port
```
- Defines how the application runs
- Sets resource limits and requests
- Configures health checks
- Specifies environment variables

### 3. Ingress Configuration (app/ingress.yaml)
```yaml
metadata:
  annotations:
    kubernetes.io/ingress.class: traefik
    traefik.ingress.kubernetes.io/router.entrypoints: web,websecure
    traefik.ingress.kubernetes.io/router.tls: "true"
spec:
  tls:
    - hosts:
        - breakscreen.com
        - www.breakscreen.com
      secretName: breakscreen-tls
```
- Configures domain routing
- Sets up SSL/TLS
- Defines path rules
- Exposes both HTTP and HTTPS endpoints (application handles redirects)

## Security Considerations

1. **Pod Security**
   - Non-root user
   - Read-only filesystem where possible
   - Resource limits

2. **Network Security**
   - Internal service not exposed directly
   - TLS everywhere
   - Client IP preservation
   - Cloudflare as additional security layer

3. **Secret Management**
   - SSL certificates in Kubernetes secrets
   - Registry credentials secure storage
   - Application secrets management

## Performance Optimization

1. **Resource Allocation**
   - CPU and memory limits set
   - Request and limit ratios optimized
   - Horizontal scaling possible

2. **Health Checks**
   - Liveness probe: Ensures container is running
   - Readiness probe: Ensures application is ready
   - Properly configured timeouts

3. **Load Balancing**
   - Traefik load balancing algorithms
   - Service load balancing
   - External load balancer integration
   - Cloudflare CDN for static content

## Best Practices Implemented

1. **High Availability**
   - Multiple replicas possible
   - Rolling updates
   - Health checks
   - Load balancer failover
   - Cloudflare fallback capabilities

2. **Monitoring & Debugging**
   - Traefik metrics available
   - Kubernetes resource monitoring
   - Log aggregation ready
   - Debug endpoints
   - Cloudflare analytics

3. **Maintenance**
   - Zero-downtime deployments
   - Easy rollback capability
   - Configuration as code
   - Documentation

## Common Operations

### Scaling
To scale the application:
```bash
kubectl scale deployment yuzu-web --replicas=3
```

### Updating
To update the application:
```bash
kubectl set image deployment/yuzu-web yuzu-web=new-image:tag
```

### Rollback
To rollback a deployment:
```bash
kubectl rollout undo deployment/yuzu-web
```

## Temporarily Disabling the Application

During development and testing phases, you may want to temporarily disable the application to conserve resources or limit access. Here are several approaches:

### Option 1: Scale to Zero (Recommended)
The simplest approach, similar to stopping an Azure Web App:

```bash
# Take the application offline
kubectl scale deployment yuzu-web --replicas=0
```

```bash
# Bring the application back online
kubectl scale deployment yuzu-web --replicas=1
```

**Benefits:**
- Simple and immediate
- Preserves all configuration
- Frees up cluster resources
- **Significantly reduces costs** (you only pay for the Kubernetes control plane and Load Balancer)
- No charges for running pods, CPU, or memory
- No charges for container image pulls or storage operations

**Considerations:**
- Users will receive connection errors rather than a maintenance page
- Cold start when bringing the app back online
- Load Balancer and Kubernetes control plane costs still apply

**Cost Impact:**
- Eliminates costs for:
  - Pod CPU and memory usage
  - Container image storage I/O
  - Ephemeral storage
  - Pod network traffic
- Remaining costs:
  - Kubernetes control plane (fixed cost)
  - Load Balancer (fixed cost)
  - Persistent storage (if any)
  - Network egress (minimal when offline)

### Option 2: Maintenance Mode
For a more professional approach, redirect traffic to a maintenance page:

1. Create a maintenance page and service
2. Temporarily update the ingress to point to the maintenance service
3. Scale down the main application

**Benefits:**
- Users see a professional maintenance page
- Better user experience

**Considerations:**
- Requires additional setup
- Still consumes some cluster resources
- Slightly higher cost than scaling to zero (requires a small maintenance pod)

### Option 3: Temporarily Remove Ingress
Remove public access while keeping the app running internally:

```bash
# Remove public access
kubectl delete ingress yuzu-web

# Restore public access when ready
kubectl apply -f /mnt/d/Repos/yuzu/k8s-deploy/app/ingress.yaml
```

**Benefits:**
- App continues running internally
- Can still be accessed via port-forwarding for testing
- DNS records remain unchanged

**Considerations:**
- Still consumes resources (pods still running)
- Requires saving ingress configuration
- No significant cost savings (still paying for running pods)

## Troubleshooting Guide

### Common Issues

1. **Pod Won't Start**
   - Check logs: `kubectl logs <pod-name>`
   - Check events: `kubectl describe pod <pod-name>`
   - Verify resource limits

2. **SSL Issues**
   - Verify secret: `kubectl get secret breakscreen-tls`
   - Check Traefik logs: `kubectl logs -n traefik <pod-name>`
   - Verify DNS settings: `dig breakscreen.com`
   - Check Cloudflare configuration

3. **Network Issues**
   - Check service: `kubectl get svc`
   - Verify ingress: `kubectl get ingress`
   - Check Traefik routing
   - Test direct load balancer IP: `curl -k https://51.158.59.242`

### Debugging Commands

1. **Pod Status**
```bash
kubectl get pods -o wide
kubectl describe pod <pod-name>
```

2. **Logs**
```bash
kubectl logs -f <pod-name>
kubectl logs -n traefik <traefik-pod-name>
```

3. **Network**
```bash
kubectl get endpoints
kubectl get ingress
```

4. **DNS Verification**
```bash
dig breakscreen.com
dig www.breakscreen.com
```

## References

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Traefik Documentation](https://doc.traefik.io/traefik/)
- [Scaleway Kubernetes Documentation](https://www.scaleway.com/en/docs/containers/kubernetes/)
- [Cloudflare Documentation](https://developers.cloudflare.com/fundamentals/)