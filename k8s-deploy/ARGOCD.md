# Argo CD Setup and Usage Guide

## Table of Contents
1. [Overview](#overview)
2. [Access Information](#access-information)
3. [Architecture](#architecture)
4. [Managing Applications](#managing-applications)
5. [Using Argo CD with Yuzu Web](#using-argo-cd-with-yuzu-web)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

## Overview

Argo CD is a declarative, GitOps continuous delivery tool for Kubernetes. It follows the GitOps pattern where Kubernetes manifests are stored in a Git repository, and Argo CD ensures that the desired state in Git is reflected in the cluster.

This document outlines how Argo CD is configured in our Scaleway Kubernetes cluster and how to use it to manage the Yuzu Web application.

## Access Information

- **URL**: https://argocd.breakscreen.com
- **Username**: admin
- **Initial Password**: l5wj6BYYqfUbLPEN
  - This should be changed after first login
  - UI: User Info (top right) → Update Password
  - CLI: `argocd account update-password`

### CLI Access

You can interact with Argo CD using the CLI tool:

```bash
# Install Argo CD CLI
curl -sSL -o argocd-linux-amd64 https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
chmod +x argocd-linux-amd64
sudo mv argocd-linux-amd64 /usr/local/bin/argocd

# Login
argocd login argocd.breakscreen.com --username admin --password l5wj6BYYqfUbLPEN --insecure

# Change password
argocd account update-password
```

## Architecture

Argo CD has been deployed with the following components:

1. **Argo CD Server**
   - Provides the API and UI
   - Exposed via Traefik ingress at argocd.breakscreen.com
   - Uses the same TLS certificate as the main application

2. **Application Controller**
   - Core component that monitors applications and syncs them with the target state
   - Runs reconciliation loops to ensure desired state

3. **Repository Server**
   - Manages Git repositories and caches repository contents
   - Generates Kubernetes manifests from applications' sources

4. **Redis**
   - Used for caching and as a pub/sub system for notifications

5. **Dex**
   - Optional SSO integration component
   - Currently configured with local user management

The deployment is configured with resource limits appropriate for a development/testing environment:

```yaml
resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 100m
    memory: 128Mi
```

## Managing Applications

### Key Concepts

- **Application**: Represents a deployed application instance in a target environment
- **Project**: Logical grouping of applications with common settings and constraints
- **Sync**: Process of ensuring the actual cluster state matches the desired state from Git
- **Sync Policy**: Rules for how and when synchronization should occur
- **Health**: Status of application resources compared to their expected state

### Creating a New Application

#### Via UI

1. Navigate to https://argocd.breakscreen.com
2. Login with admin credentials
3. Click "New App" button in the top left
4. Fill in the form:
   - Application Name: Choose a descriptive name (e.g., "yuzu-web-prod")
   - Project: Select "default" (or create a custom project)
   - Sync Policy: Choose "Manual" or "Automatic"
   - Repository URL: Your Git repository URL
   - Revision: Branch/tag/commit to use (e.g., "main")
   - Path: Directory in the repo containing Kubernetes manifests
   - Destination: The cluster and namespace to deploy to
5. Click "Create"

#### Via CLI

```bash
argocd app create yuzu-web-prod \
  --repo https://github.com/your-org/yuzu-web.git \
  --path k8s-deploy \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace default \
  --sync-policy automated
```

#### Via YAML

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: yuzu-web-prod
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/yuzu-web.git
    targetRevision: main
    path: k8s-deploy
  destination:
    server: https://kubernetes.default.svc
    namespace: default
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

### Syncing an Application

#### Via UI

1. Navigate to the application
2. Click "Sync" button
3. Review changes and confirm

#### Via CLI

```bash
argocd app sync yuzu-web-prod
```

### Viewing Application Status

#### Via UI

1. Navigate to the application
2. View the sync status, health status, and resource tree

#### Via CLI

```bash
argocd app get yuzu-web-prod
```

## Using Argo CD with Yuzu Web

### Repository Structure for GitOps

To use Argo CD with Yuzu Web, organize your repository with the following structure:

```
yuzu-repo/
├── src/                # Application source code
├── ...
└── k8s-deploy/         # Kubernetes manifests for GitOps
    ├── app/
    │   ├── deployment.yaml
    │   ├── service.yaml
    │   └── ingress.yaml
    ├── traefik/
    │   └── values.yaml
    └── argocd/
        └── application.yaml
```

### Setting Up Yuzu Web as an Argo CD Application

1. Create an application.yaml file in your repository:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: yuzu-web
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/yuzu-repo.git
    targetRevision: main
    path: k8s-deploy/app
  destination:
    server: https://kubernetes.default.svc
    namespace: default
  syncPolicy:
    automated:
      prune: true  # Automatically delete resources that are no longer in Git
      selfHeal: true  # Automatically sync if drift is detected
```

2. Apply this file to your cluster:

```bash
kubectl apply -f application.yaml
```

### Handling Environment-Specific Configuration

For managing different environments (dev, staging, prod), consider these approaches:

1. **Separate Paths**:
   ```
   k8s-deploy/
   ├── dev/
   ├── staging/
   └── prod/
   ```

2. **Separate Branches**:
   - Use different branches for each environment
   - Specify the branch in the targetRevision field

3. **Kustomize**:
   - Use Kustomize overlays for environment-specific changes
   - Argo CD has native support for Kustomize

Example for Kustomize:
```
k8s-deploy/
├── base/
│   ├── deployment.yaml
│   ├── service.yaml
│   └── ingress.yaml
└── overlays/
    ├── dev/
    │   └── kustomization.yaml
    ├── staging/
    │   └── kustomization.yaml
    └── prod/
        └── kustomization.yaml
```

### Continuous Deployment Workflow

1. **Development**:
   - Develop locally using standard workflows
   - Build and push Docker image with new version tag

2. **Update Manifests**:
   - Update image version in deployment.yaml
   - Commit and push changes to the Git repository

3. **Automatic Deployment**:
   - Argo CD detects changes in the repository
   - If using automated sync policy, changes are applied immediately
   - If using manual sync policy, approve changes through UI or CLI

4. **Verification**:
   - Argo CD shows application health and sync status
   - Monitor application logs and metrics

### Image Updates

For automatic image updates, consider adding **Argo CD Image Updater**, which can:
- Automatically detect new image versions in your container registry
- Update the manifests in your Git repository
- Trigger Argo CD sync to deploy the new version

## Best Practices

### Security

1. **Change Default Admin Password**
   - Change the default admin password immediately after installation

2. **Use Projects to Control Access**
   - Create specific projects for different teams or applications
   - Limit which clusters and namespaces a project can deploy to

3. **RBAC Integration**
   - Configure RBAC for fine-grained access control
   - Integrate with existing SSO if available

### Performance

1. **Resource Management**
   - Adjust resource requests and limits based on actual usage
   - Monitor Argo CD component resource usage

2. **Sync Windows**
   - Configure sync windows to control when automated syncs can occur
   - Avoid disruptions during critical business hours

### Reliability

1. **Health Checks**
   - Define custom health checks for application-specific health monitoring
   - Ensure proper readiness and liveness probes in your deployments

2. **Progressive Delivery**
   - Use Argo Rollouts for blue/green or canary deployments
   - Gradually roll out changes to minimize impact

## Troubleshooting

### Common Issues

1. **Application stuck in "Progressing" state**
   - Check pod events: `kubectl describe pod <pod-name>`
   - Check application logs: `kubectl logs -n argocd deployment/argocd-application-controller`

2. **Authentication Issues**
   - Check Dex logs: `kubectl logs -n argocd deployment/argocd-dex-server`
   - Verify correctly configured OIDC settings

3. **Sync Failures**
   - Examine sync error in UI or CLI: `argocd app get yuzu-web-prod`
   - Check if application source exists and is accessible
   - Validate Kubernetes manifests

### Useful Commands

```bash
# Get application status
argocd app get yuzu-web-prod

# Show application deployment history
argocd app history yuzu-web-prod

# Rollback to a previous version
argocd app rollback yuzu-web-prod 1

# Force refresh application state
argocd app refresh yuzu-web-prod

# View cluster events
kubectl get events -n default

# Check Argo CD controller logs
kubectl logs -n argocd deployment/argocd-application-controller
```

### Support Resources

- [Argo CD Documentation](https://argo-cd.readthedocs.io/)
- [Argo CD GitHub Issues](https://github.com/argoproj/argo-cd/issues)
- [Argo CD Slack Channel](https://argoproj.github.io/community/join-slack)