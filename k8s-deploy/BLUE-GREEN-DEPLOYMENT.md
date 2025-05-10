# Blue-Green Deployment Guide with Argo CD

This guide explains how to implement Blue-Green deployments for the Yuzu application using Argo CD on a Scaleway Kubernetes cluster.

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Setting Up Argo CD with Argo Rollouts](#setting-up-argo-cd-with-argo-rollouts)
4. [Directory Structure for Blue-Green Deployments](#directory-structure-for-blue-green-deployments)
5. [Creating Blue-Green Deployment Manifests](#creating-blue-green-deployment-manifests)
6. [Implementing the Blue-Green Deployment](#implementing-the-blue-green-deployment)
7. [Monitoring and Verifying Deployments](#monitoring-and-verifying-deployments)
8. [Rollback Procedure](#rollback-procedure)
9. [Automated Blue-Green Deployment Process](#automated-blue-green-deployment-process)
10. [Best Practices](#best-practices)

## Overview

Blue-Green deployment is a technique that reduces downtime and risk by creating two identical environments (Blue and Green). At any time, one environment is live and serving production traffic, while the other remains idle. When a new version needs to be deployed, it's deployed to the idle environment, tested, and then traffic is switched over.

**Benefits of Blue-Green Deployments**:
- Zero downtime deployments
- Easy rollbacks if issues are detected
- Ability to test the new version in a production-like environment before exposing it to users
- Gradual traffic shifting possible

## Prerequisites

- A working Kubernetes cluster with Argo CD installed
- `kubectl` configured to communicate with your cluster
- `helm` installed locally
- Access to the Yuzu Docker registry
- Basic understanding of Kubernetes and Argo CD (refer to INSTALLATION.md)

## Setting Up Argo CD with Argo Rollouts

Argo Rollouts is an extension to Argo CD that provides advanced deployment capabilities, including Blue-Green deployments.

```bash
# Install Argo Rollouts controller
kubectl create namespace argo-rollouts
helm repo add argo https://argoproj.github.io/argo-helm
helm repo update
helm install argo-rollouts argo/argo-rollouts --namespace argo-rollouts

# Install Argo Rollouts kubectl plugin
curl -LO https://github.com/argoproj/argo-rollouts/releases/latest/download/kubectl-argo-rollouts-linux-amd64
chmod +x ./kubectl-argo-rollouts-linux-amd64
sudo mv ./kubectl-argo-rollouts-linux-amd64 /usr/local/bin/kubectl-argo-rollouts

# Verify the installation
kubectl argo rollouts version
```

## Directory Structure for Blue-Green Deployments

Organize your repository to support Blue-Green deployments:

```
yuzu-repo/
├── k8s-deploy/
    ├── base/
    │   ├── deployment.yaml
    │   ├── service.yaml
    │   ├── ingress.yaml
    │   └── kustomization.yaml
    └── overlays/
        ├── blue-green/
        │   ├── rollout.yaml
        │   ├── services.yaml
        │   └── kustomization.yaml
        └── standard/
            └── kustomization.yaml
```

## Creating Blue-Green Deployment Manifests

### 1. Create Base Kustomization

```yaml
# k8s-deploy/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
- service.yaml
- ingress.yaml
```

### 2. Create Blue-Green Service Definitions

```yaml
# k8s-deploy/overlays/blue-green/services.yaml
apiVersion: v1
kind: Service
metadata:
  name: yuzu-web-active
spec:
  selector:
    app: yuzu-web
    # This service selects pods with "active" role based on Rollout controller
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8080
  type: ClusterIP
---
apiVersion: v1
kind: Service
metadata:
  name: yuzu-web-preview
spec:
  selector:
    app: yuzu-web
    # This service selects pods with "preview" role based on Rollout controller
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8080
  type: ClusterIP
```

### 3. Create Rollout Definition

```yaml
# k8s-deploy/overlays/blue-green/rollout.yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: yuzu-web
spec:
  replicas: 2
  revisionHistoryLimit: 2
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
        image: rg.fr-par.scw.cloud/cr-yuzu-par-1/yuzu-web:latest
        ports:
        - containerPort: 8080
        env:
        - name: ASPNETCORE_ENVIRONMENT
          value: "Production"
        - name: ASPNETCORE_URLS
          value: "http://+:8080"
        envFrom:
        - secretRef:
            name: yuzu-app-secrets
        resources:
          limits:
            cpu: "1"
            memory: "1Gi"
          requests:
            cpu: "200m"
            memory: "512Mi"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 30
          timeoutSeconds: 5
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 15
          periodSeconds: 10
          timeoutSeconds: 3
      imagePullSecrets:
      - name: scaleway-registry-credentials
  strategy:
    blueGreen:
      activeService: yuzu-web-active
      previewService: yuzu-web-preview
      autoPromotionEnabled: false  # Disabled for manual verification before switching
      prePromotionAnalysis:
        templates:
        - templateName: smoke-tests
        args:
        - name: service-name
          value: yuzu-web-preview
      postPromotionAnalysis:
        templates:
        - templateName: performance-tests
        args:
        - name: service-name
          value: yuzu-web-active
```

### 4. Create Blue-Green Kustomization

```yaml
# k8s-deploy/overlays/blue-green/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
- ../../base
- services.yaml
- rollout.yaml
```

### 5. Create Standard Kustomization (for reference)

```yaml
# k8s-deploy/overlays/standard/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
- ../../base
```

### 6. Create Analysis Templates for Pre/Post Promotion

```yaml
# k8s-deploy/overlays/blue-green/analysis-templates.yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: smoke-tests
spec:
  args:
  - name: service-name
  metrics:
  - name: smoke-test
    provider:
      job:
        spec:
          backoffLimit: 1
          template:
            spec:
              containers:
              - name: smoke-tests
                image: curlimages/curl:latest
                command: ["curl", "-f", "$(service-name)/health"]
              restartPolicy: Never
---
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: performance-tests
spec:
  args:
  - name: service-name
  metrics:
  - name: latency-test
    provider:
      job:
        spec:
          backoffLimit: 1
          template:
            spec:
              containers:
              - name: performance-tests
                image: loadimpact/k6:latest
                command: ["k6", "run", "-"]
                stdin: |
                  import http from 'k6/http';
                  import { check, sleep } from 'k6';
                  
                  export default function() {
                    let res = http.get('http://$(service-name)/health');
                    check(res, {
                      'status is 200': (r) => r.status === 200,
                      'response time < 500ms': (r) => r.timings.duration < 500
                    });
                    sleep(0.1);
                  }
              restartPolicy: Never
```

## Implementing the Blue-Green Deployment

### 1. Create Argo CD Application for Blue-Green Deployment

```yaml
# yuzu-argocd-bluegreen-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: yuzu-web-bluegreen
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/yuzu-repo.git  # Replace with your actual Git repository URL
    targetRevision: main
    path: k8s-deploy/overlays/blue-green
  destination:
    server: https://kubernetes.default.svc
    namespace: default
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

### 2. Apply the Application to Argo CD

```bash
kubectl apply -f yuzu-argocd-bluegreen-app.yaml
```

### 3. Update Ingress to Point to the Active Service

Update your existing ingress to point to the `yuzu-web-active` service instead of the regular `yuzu-web` service.

```yaml
# app/ingress.yaml (modified)
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: yuzu-web
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
  rules:
  - host: breakscreen.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: yuzu-web-active  # Changed from yuzu-web to yuzu-web-active
            port:
              number: 80
  - host: www.breakscreen.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: yuzu-web-active  # Changed from yuzu-web to yuzu-web-active
            port:
              number: 80
```

### 4. Create Preview Ingress for Testing

```yaml
# app/preview-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: yuzu-web-preview
  annotations:
    kubernetes.io/ingress.class: traefik
    traefik.ingress.kubernetes.io/router.entrypoints: web,websecure
    traefik.ingress.kubernetes.io/router.tls: "true"
spec:
  tls:
  - hosts:
    - preview.breakscreen.com
    secretName: breakscreen-tls
  rules:
  - host: preview.breakscreen.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: yuzu-web-preview
            port:
              number: 80
```

### 5. Apply the Ingress Configurations

```bash
kubectl apply -f app/ingress.yaml
kubectl apply -f app/preview-ingress.yaml
```

## Monitoring and Verifying Deployments

### 1. Watch Rollout Status

```bash
# Check rollout status
kubectl argo rollouts get rollout yuzu-web --watch

# GUI visualization
kubectl argo rollouts dashboard
```

### 2. Verify the New Version in Preview Environment

```bash
# Test the preview environment
curl -k https://preview.breakscreen.com/health

# Or visit https://preview.breakscreen.com in a browser
```

### 3. Promote a Successful Deployment

```bash
# Once verified, promote the rollout to make it active
kubectl argo rollouts promote yuzu-web
```

## Rollback Procedure

If an issue is detected with the new version, you can abort the rollout:

```bash
# Abort the rollout (if not yet promoted)
kubectl argo rollouts abort yuzu-web

# For a promoted rollout, you can perform a rollback
kubectl argo rollouts undo yuzu-web
```

## Automated Blue-Green Deployment Process

For a fully automated CI/CD pipeline, you can use GitHub Actions or other CI/CD tools:

```yaml
# Example GitHub Action workflow for automated deployment
name: Blue-Green Deployment

on:
  push:
    branches: [main]
    paths:
      - 'src/**'
      - 'k8s-deploy/**'

jobs:
  build-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Build and push Docker image
        uses: docker/build-push-action@v2
        with:
          context: .
          push: true
          tags: rg.fr-par.scw.cloud/cr-yuzu-par-1/yuzu-web:${{ github.sha }}
      
      - name: Update Rollout with new image
        run: |
          # Install kubectl and argo rollouts plugin
          # ...
          
          # Update the image in the rollout manifest
          sed -i "s|image: rg.fr-par.scw.cloud/cr-yuzu-par-1/yuzu-web:.*|image: rg.fr-par.scw.cloud/cr-yuzu-par-1/yuzu-web:${{ github.sha }}|" k8s-deploy/overlays/blue-green/rollout.yaml
          
          # Commit and push the updated manifest back to the repo
          git config --global user.name "GitHub Action"
          git config --global user.email "action@github.com"
          git add k8s-deploy/overlays/blue-green/rollout.yaml
          git commit -m "Update rollout image to ${{ github.sha }}"
          git push
      
      # Argo CD will automatically detect the change and start the new rollout
```

## Best Practices

### 1. Testing Strategies

- **Preview Testing**: Always test the new version in the preview environment before promotion
- **Smoke Tests**: Run basic health checks to verify core functionality
- **Load Testing**: Test performance under load to detect performance regressions
- **Feature Testing**: Use a service mesh like Istio for feature flag testing alongside Blue-Green deployments

### 2. Resource Management

- Size your cluster appropriately as Blue-Green deployments double resource usage during transitions
- Use resource requests and limits to prevent resource contention
- Consider node affinity to place blue and green deployments on different nodes for reliability

### 3. Database Migrations

- **Forward-Compatible Schema**: Ensure database changes are backward-compatible with the old version
- **Schema Versioning**: Use a database migration tool that supports versioning
- **Migration Timing**: Run migrations before deploying the new version
- **Rollback Plan**: Have a rollback plan for database changes

### 4. Monitoring

- Set up appropriate monitoring dashboards for both Blue and Green environments
- Monitor key metrics during and after the transition
- Log all deployments, promotions, and rollbacks for audit purposes

### 5. Security Considerations

- Ensure both environments use the same security configurations
- Update security groups and network policies to allow access to both environments
- Consider security testing as part of your pre-promotion checks

### 6. Cost Optimization

- Scale down the idle environment to minimum capacity when not in use
- Use spot instances or preemptible VMs for cost savings during testing
- Consider cleanup jobs to remove old and unused resources

### 7. Namespaces

- Consider using separate namespaces for Blue and Green environments for additional isolation
- Use resource quotas to limit resource usage in each namespace

## Conclusion

Blue-Green deployments provide a robust way to deploy new versions of your application with minimal risk and zero downtime. By leveraging Argo CD and Argo Rollouts, you can implement this pattern in a GitOps-compliant way, with full automation and control over the deployment process.