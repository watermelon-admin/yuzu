# Comprehensive Blue-Green Deployment Guide with Argo CD

This comprehensive guide explains how to implement Blue-Green deployments for the Yuzu application using Argo CD on a Scaleway Kubernetes cluster. This guide assumes minimal prior knowledge and explains every concept, tool, and file in detail.

## Table of Contents
1. [Introduction to Blue-Green Deployments](#introduction-to-blue-green-deployments)
2. [Key Concepts and Terminology](#key-concepts-and-terminology)
3. [Prerequisites and Environment Setup](#prerequisites-and-environment-setup)
4. [Setting Up Argo CD and Argo Rollouts](#setting-up-argo-cd-and-argo-rollouts)
5. [Directory Structure for Blue-Green Deployments](#directory-structure-for-blue-green-deployments)
6. [Detailed Breakdown of Each Configuration File](#detailed-breakdown-of-each-configuration-file)
7. [Implementing the Blue-Green Deployment Step-by-Step](#implementing-the-blue-green-deployment-step-by-step)
8. [Testing, Monitoring, and Verifying Deployments](#testing-monitoring-and-verifying-deployments)
9. [Rollback Procedures and Recovery](#rollback-procedures-and-recovery)
10. [Automating the Blue-Green Deployment Process](#automating-the-blue-green-deployment-process)
11. [Advanced Considerations and Best Practices](#advanced-considerations-and-best-practices)
12. [Troubleshooting Common Issues](#troubleshooting-common-issues)
13. [FAQs and Reference Information](#faqs-and-reference-information)

## Introduction to Blue-Green Deployments

### What is a Blue-Green Deployment?

Blue-Green deployment is a software release strategy that maintains two identical production environments, referred to as "Blue" and "Green." At any given time, only one of these environments is actively serving user traffic, while the other remains idle.

### How Does It Work?

1. **Initial State**: The "Blue" environment is active and serving all user traffic. The "Green" environment is idle or doesn't exist yet.
2. **Deployment**: When a new application version is ready for release, it's deployed to the idle "Green" environment.
3. **Testing**: The new version in the "Green" environment is thoroughly tested without affecting users.
4. **Transition**: Once verified, traffic is switched from "Blue" to "Green" (typically by updating a load balancer or service router).
5. **Completion**: "Green" becomes the active environment, and "Blue" becomes idle. For the next deployment, the process reverses.

### Advantages of Blue-Green Deployments

- **Zero Downtime**: Users experience no service interruptions during deployments.
- **Risk Reduction**: Problems with the new version affect no users until traffic is switched.
- **Easy Rollback**: If issues are discovered after the switch, traffic can be immediately redirected back to the previous environment.
- **Testing in Production-Like Environment**: The new version can be tested in an environment identical to production.
- **Predictable Release Process**: The structured approach reduces deployment complexity and potential for errors.

### Disadvantages and Challenges

- **Resource Requirements**: Maintaining two identical environments doubles resource usage during the transition.
- **Database Considerations**: Database schema changes must support both versions simultaneously.
- **Stateful Applications**: Session management and persistent connections require additional handling.
- **Cost**: Running two environments simultaneously increases infrastructure costs.

## Key Concepts and Terminology

### Kubernetes Concepts

- **Cluster**: A set of worker machines (nodes) that run containerized applications managed by Kubernetes.
- **Namespace**: A virtual cluster within a physical cluster, providing a scope for resources.
- **Pod**: The smallest deployable unit in Kubernetes, representing one or more containers that share storage and network resources.
- **Deployment**: A Kubernetes resource that manages a set of identical pods, handling updates, scaling, and rollbacks.
- **Service**: An abstract way to expose an application running on a set of Pods as a network service.
- **Ingress**: An API object that manages external access to services in a cluster, typically HTTP.
- **Secret**: An object containing sensitive data such as passwords, tokens, or keys.
- **ConfigMap**: An object used to store non-sensitive configuration data in key-value pairs.

### Argo CD and GitOps Terminology

- **GitOps**: A methodology where the entire system's desired state is stored in a Git repository, and automated processes ensure the actual state matches the desired state.
- **Argo CD**: A declarative, GitOps continuous delivery tool for Kubernetes that helps maintain applications in a desired state.
- **Application**: In Argo CD, a custom resource that represents an application deployment.
- **Sync**: The process of updating the actual state of an application to match the desired state defined in Git.
- **Sync Policy**: Rules that determine how Argo CD should behave when changes are detected.
- **Argo Rollouts**: An extension to Argo CD that provides advanced deployment capabilities like Blue-Green and Canary deployments.
- **Rollout**: A custom resource in Argo Rollouts that replaces the standard Kubernetes Deployment for advanced deployment strategies.

### Kustomize Concepts

- **Kustomize**: A tool built into kubectl that allows customizing Kubernetes manifests without using template engines.
- **Base**: A directory containing a set of YAML files that define a standard configuration.
- **Overlay**: A directory containing a kustomization file that references a base and applies customizations to it.
- **Kustomization.yaml**: A file that defines how to customize or transform Kubernetes resources.
- **Patches**: Modifications applied to base resources by overlays.
- **Resources**: Kubernetes manifests that are included in the kustomization.

### Blue-Green Deployment Specific Terms

- **Active Environment**: The environment currently serving production traffic (either Blue or Green).
- **Preview Environment**: The environment with the new version, not yet serving production traffic.
- **Promotion**: The process of switching traffic from the current active environment to the preview environment.
- **Rollback**: The process of reverting to the previous active environment if issues are discovered.
- **Analysis**: Automated testing performed during the deployment process to validate the new version.

## Prerequisites and Environment Setup

### Required Knowledge

- **Basic Kubernetes**: Understanding of Kubernetes concepts like pods, deployments, services, and ingress controllers.
- **Command Line Usage**: Familiarity with bash, kubectl, and other command-line tools.
- **YAML**: Knowledge of YAML syntax for creating and editing Kubernetes manifests.
- **Git**: Basic Git operations for version control.

### Required Tools

1. **kubectl**: Command-line tool for interacting with Kubernetes clusters.

```bash
# Installation on Linux
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/

# Verify installation
kubectl version --client
```

2. **helm**: Package manager for Kubernetes.

```bash
# Installation on Linux
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Verify installation
helm version
```

3. **git**: Version control system.

```bash
# Installation on Linux
sudo apt-get update
sudo apt-get install git

# Verify installation
git --version
```

4. **kubectl argo rollouts plugin**: Command-line tool for Argo Rollouts.

```bash
# Installation will be covered in later sections
```

### Kubernetes Cluster Setup

Ensure you have a working Kubernetes cluster. If not, refer to the INSTALLATION.md guide for setting up a Scaleway Kubernetes (K2s) cluster.

```bash
# Verify cluster connection
kubectl cluster-info

# Check available nodes
kubectl get nodes
```

### Container Registry Access

Ensure you have access to the container registry where your application images are stored.

```bash
# Test access by pulling a sample image
docker pull rg.fr-par.scw.cloud/cr-yuzu-par-1/yuzu-web:latest
```

## Setting Up Argo CD and Argo Rollouts

### What is Argo CD?

Argo CD is a declarative, GitOps continuous delivery tool for Kubernetes. It follows the principle that the desired state of applications and infrastructure should be stored in Git, and automated processes should ensure the actual state matches this desired state.

### What is Argo Rollouts?

Argo Rollouts is an extension to Argo CD that provides advanced deployment capabilities, including Blue-Green and Canary deployments. It introduces a custom Kubernetes controller and CRDs (Custom Resource Definitions) that enable these strategies.

### Installing Argo CD

If Argo CD is not already installed in your cluster (refer to INSTALLATION.md), follow these steps:

```bash
# Create namespace for Argo CD
kubectl create namespace argocd

# Install Argo CD
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Wait for Argo CD components to be ready
kubectl wait --for=condition=available deployment/argocd-server -n argocd --timeout=300s

# Get the initial admin password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```

### Installing Argo Rollouts

Argo Rollouts adds the necessary components for advanced deployment strategies:

```bash
# Create namespace for Argo Rollouts
kubectl create namespace argo-rollouts

# Install Argo Rollouts controller
kubectl apply -n argo-rollouts -f https://github.com/argoproj/argo-rollouts/releases/latest/download/install.yaml

# Verify installation
kubectl get pods -n argo-rollouts
```

### Installing the Argo Rollouts Kubectl Plugin

The kubectl plugin provides command-line capabilities for working with Argo Rollouts:

```bash
# Linux Installation
curl -LO https://github.com/argoproj/argo-rollouts/releases/latest/download/kubectl-argo-rollouts-linux-amd64
chmod +x ./kubectl-argo-rollouts-linux-amd64
sudo mv ./kubectl-argo-rollouts-linux-amd64 /usr/local/bin/kubectl-argo-rollouts

# Verify installation
kubectl argo rollouts version
```

### Understanding Argo CD Architecture

Argo CD consists of several components:

- **API Server**: Exposes the API consumed by the Web UI, CLI, and CI/CD systems.
- **Repository Server**: Internal service that maintains a local cache of Git repositories.
- **Application Controller**: Kubernetes controller that continuously monitors applications and compares current state with desired state.
- **Dex**: Optional component for SSO integration.

### Understanding Argo Rollouts Architecture

Argo Rollouts extends Kubernetes with:

- **Rollout Controller**: Manages the custom Rollout resource.
- **Rollout Resource**: Replaces the standard Kubernetes Deployment for advanced strategies.
- **Analysis Templates**: Define metrics and tests for validating deployments.
- **Experiments**: Allow testing changes before full deployment.

## Directory Structure for Blue-Green Deployments

### Kustomize: A Primer

Kustomize is a tool that allows you to customize Kubernetes manifests without using template engines. It's built into kubectl and follows a layered approach to configuration management:

1. **Base Layer**: Contains common, foundational configurations.
2. **Overlay Layers**: Build upon and customize the base for specific environments or scenarios.

This approach separates common configurations from environment-specific variations, making it easier to manage multiple environments.

### Why Use Kustomize for Blue-Green Deployments?

- **Variant Management**: Easily maintain different deployment strategies (standard vs. blue-green).
- **DRY Principle**: Avoid duplicating common configurations.
- **GitOps Friendly**: Works well with Argo CD's GitOps approach.
- **No Templates**: Uses plain YAML, avoiding complex templating languages.

### Recommended Directory Structure

Below is a detailed explanation of the recommended directory structure for organizing your Blue-Green deployment files:

```
yuzu-repo/
├── k8s-deploy/                  # Root directory for Kubernetes configurations
    ├── base/                    # Base configuration (common to all deployment strategies)
    │   ├── deployment.yaml      # Standard deployment definition (used as reference)
    │   ├── service.yaml         # Service definition for the application
    │   ├── ingress.yaml         # Ingress configuration for external access
    │   └── kustomization.yaml   # Kustomize file defining the base resources
    └── overlays/                # Directory containing environment-specific overlays
        ├── blue-green/          # Configuration specific to blue-green deployment
        │   ├── rollout.yaml     # Argo Rollouts definition replacing standard deployment
        │   ├── services.yaml    # Defines both active and preview services
        │   ├── analysis.yaml    # Analysis templates for testing
        │   ├── ingress.yaml     # Modified ingress for blue-green setup
        │   └── kustomization.yaml # Kustomize file referencing base and blue-green specifics
        └── standard/            # Standard deployment configuration (alternative to blue-green)
            └── kustomization.yaml # Kustomize file just using the base components
```

### Explanation of Key Files:

- **base/deployment.yaml**: Contains the standard Kubernetes Deployment definition (not used in blue-green but kept as reference).
- **base/service.yaml**: Defines the regular service for the application.
- **base/ingress.yaml**: Contains the standard ingress configuration.
- **base/kustomization.yaml**: Lists the resources to include in the base configuration.
- **overlays/blue-green/rollout.yaml**: Replaces the standard deployment with an Argo Rollout, defining the blue-green strategy.
- **overlays/blue-green/services.yaml**: Defines both the active service (receiving production traffic) and preview service (for testing new versions).
- **overlays/blue-green/analysis.yaml**: Contains AnalysisTemplates defining tests to run during the deployment.
- **overlays/blue-green/kustomization.yaml**: References the base and adds blue-green specific resources.
- **overlays/standard/kustomization.yaml**: A simple overlay that just uses the base components without modifications.

## Detailed Breakdown of Each Configuration File

### Base Configuration Files

#### 1. base/deployment.yaml

This file defines a standard Kubernetes Deployment. In a blue-green setup, this will be replaced by a Rollout resource, but it's kept as a reference:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: yuzu-web
  labels:
    app: yuzu-web
spec:
  replicas: 2  # Number of identical pods to run
  selector:
    matchLabels:
      app: yuzu-web  # Label selector to identify which pods this deployment manages
  template:
    metadata:
      labels:
        app: yuzu-web  # Labels applied to pods created by this deployment
    spec:
      containers:  # List of containers in each pod
      - name: yuzu-web
        image: rg.fr-par.scw.cloud/cr-yuzu-par-1/yuzu-web:latest  # Container image to use
        ports:
        - containerPort: 8080  # Port the application listens on
        env:  # Environment variables for the container
        - name: ASPNETCORE_ENVIRONMENT
          value: "Production"
        - name: ASPNETCORE_URLS
          value: "http://+:8080"
        envFrom:  # Reference to environment variables from a secret
        - secretRef:
            name: yuzu-app-secrets
        resources:  # Resource limits and requests
          limits:
            cpu: "1"
            memory: "1Gi"
          requests:
            cpu: "200m"
            memory: "512Mi"
        livenessProbe:  # Checks if the container is alive
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 30
          timeoutSeconds: 5
        readinessProbe:  # Checks if the container is ready to receive traffic
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 15
          periodSeconds: 10
          timeoutSeconds: 3
      imagePullSecrets:  # Credentials for pulling from private registry
      - name: scaleway-registry-credentials
```

**Explanation of Key Concepts**:
- **Deployment**: A Kubernetes resource that ensures a specified number of pod replicas are running.
- **Replicas**: Number of identical pods to maintain.
- **Selector**: How the deployment identifies which pods it manages.
- **Template**: Defines the pod template to use when creating new pods.
- **Containers**: List of containers to run within each pod.
- **Image**: Docker image to use for the container.
- **Probes**: Health checks that Kubernetes uses to monitor container health.
- **Resources**: CPU and memory limits and requests for the container.

#### 2. base/service.yaml

This file defines the Kubernetes Service that exposes the application pods:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: yuzu-web
spec:
  selector:
    app: yuzu-web  # Selects pods with this label
  ports:
    - protocol: TCP
      port: 80  # Port exposed by the service
      targetPort: 8080  # Port on the pod to forward to
  type: ClusterIP  # Service type (internal to the cluster)
```

**Explanation of Key Concepts**:
- **Service**: A Kubernetes abstraction that defines a logical set of pods and a policy for accessing them.
- **Selector**: Labels used to determine which pods the service routes traffic to.
- **Ports**: Network ports configuration, mapping external ports to container ports.
- **Type**: Defines how the service is exposed (ClusterIP is only accessible within the cluster).

#### 3. base/ingress.yaml

This file defines the Ingress resource for external access to the application:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: yuzu-web
  annotations:
    kubernetes.io/ingress.class: traefik  # Specifies which ingress controller to use
    traefik.ingress.kubernetes.io/router.entrypoints: web,websecure  # Traefik-specific config
    traefik.ingress.kubernetes.io/router.tls: "true"  # Enable TLS
spec:
  tls:  # TLS configuration
  - hosts:
    - breakscreen.com
    - www.breakscreen.com
    secretName: breakscreen-tls  # Secret containing TLS certificate
  rules:  # Routing rules
  - host: breakscreen.com  # Domain name
    http:
      paths:
      - path: /  # URL path
        pathType: Prefix  # Match type (Prefix matches /path and /path/subpath)
        backend:
          service:
            name: yuzu-web  # Service to route to
            port:
              number: 80  # Service port
  - host: www.breakscreen.com  # Additional domain name
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: yuzu-web
            port:
              number: 80
```

**Explanation of Key Concepts**:
- **Ingress**: A Kubernetes resource that manages external access to services in a cluster.
- **Annotations**: Additional configuration for the ingress controller.
- **TLS**: Configuration for SSL/TLS certificates.
- **Rules**: Define how traffic is routed based on host and path.
- **Backend**: The service that receives the traffic.

#### 4. base/kustomization.yaml

This file defines which resources are part of the base configuration:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:  # List of Kubernetes manifests to include
- service.yaml
- ingress.yaml
# deployment.yaml is commented out because we'll use rollout.yaml in blue-green overlay
```

**Explanation of Key Concepts**:
- **Kustomization**: A resource that defines how to generate or transform Kubernetes manifests.
- **Resources**: List of YAML files to include in the kustomization.
- **Note**: We exclude deployment.yaml as it will be replaced by rollout.yaml in the blue-green overlay.

### Blue-Green Configuration Files

#### 1. overlays/blue-green/rollout.yaml

This file replaces the standard deployment with an Argo Rollout resource, defining the blue-green strategy:

```yaml
apiVersion: argoproj.io/v1alpha1  # API version for Argo Rollouts CRDs
kind: Rollout  # Custom resource type defined by Argo Rollouts
metadata:
  name: yuzu-web
spec:
  replicas: 2  # Number of desired pods
  revisionHistoryLimit: 2  # Number of old ReplicaSets to retain
  selector:
    matchLabels:
      app: yuzu-web  # Selector for pods managed by this rollout
  template:  # Pod template (same as in a standard deployment)
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
  strategy:  # Deployment strategy - this is where blue-green is defined
    blueGreen:  # Specifies a blue-green deployment strategy
      activeService: yuzu-web-active  # Service pointing to the active deployment
      previewService: yuzu-web-preview  # Service pointing to the preview deployment
      autoPromotionEnabled: false  # If true, automatically promotes after all analysis runs successfully
      prePromotionAnalysis:  # Analysis to run before promoting the new version
        templates:
        - templateName: smoke-tests  # Reference to an AnalysisTemplate
        args:  # Arguments to pass to the analysis
        - name: service-name
          value: yuzu-web-preview
      postPromotionAnalysis:  # Analysis to run after promoting the new version
        templates:
        - templateName: performance-tests
        args:
        - name: service-name
          value: yuzu-web-active
```

**Explanation of Key Concepts**:
- **Rollout**: Argo Rollouts' alternative to a standard Kubernetes Deployment.
- **Strategy**: Defines how updates are performed (blueGreen in this case).
- **activeService**: The service that points to the current active deployment.
- **previewService**: The service that points to the new version (pre-promotion).
- **autoPromotionEnabled**: Whether to automatically promote the new version after analysis.
- **prePromotionAnalysis**: Tests to run before promoting the new version.
- **postPromotionAnalysis**: Tests to run after promoting the new version.

#### 2. overlays/blue-green/services.yaml

This file defines both the active and preview services needed for blue-green deployment:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: yuzu-web-active  # Service pointing to the active deployment
spec:
  selector:
    app: yuzu-web  # Base selector (Argo Rollouts will add additional labels)
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8080
  type: ClusterIP
---
apiVersion: v1
kind: Service
metadata:
  name: yuzu-web-preview  # Service pointing to the preview deployment
spec:
  selector:
    app: yuzu-web  # Base selector (Argo Rollouts will add additional labels)
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8080
  type: ClusterIP
```

**Explanation of Key Concepts**:
- **Multiple Services**: Both services have the same selector base, but Argo Rollouts adds additional labels to distinguish between active and preview pods.
- **YAML Document Separator**: The `---` separates multiple YAML documents in a single file.

#### 3. overlays/blue-green/analysis.yaml

This file defines analysis templates for testing during the deployment:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate  # Custom resource defined by Argo Rollouts
metadata:
  name: smoke-tests  # Name referenced in the rollout
spec:
  args:  # Arguments that can be passed to the analysis
  - name: service-name
  metrics:  # Metrics to evaluate
  - name: smoke-test  # Name of this metric
    provider:  # Provider defines how to collect the metric
      job:  # Run as a Kubernetes Job
        spec:
          backoffLimit: 1  # Number of retries
          template:
            spec:
              containers:
              - name: smoke-tests
                image: curlimages/curl:latest  # Image with curl installed
                command: ["curl", "-f", "$(service-name)/health"]  # Simple HTTP check
              restartPolicy: Never  # Don't restart failed containers
---
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: performance-tests  # Name referenced in the rollout
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
                image: loadimpact/k6:latest  # Image with k6 load testing tool
                command: ["k6", "run", "-"]  # Run k6 with stdin script
                stdin: |  # Heredoc for inline script
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

**Explanation of Key Concepts**:
- **AnalysisTemplate**: Defines tests to run during the deployment process.
- **Metrics**: Individual measurements or tests to perform.
- **Provider**: How to collect the metric (job, web, Prometheus, etc.).
- **Job**: A Kubernetes Job that runs to completion and reports success/failure.
- **Args**: Parameters that can be passed to the analysis.

#### 4. overlays/blue-green/preview-ingress.yaml

This file defines an ingress for accessing the preview environment:

```yaml
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
  - host: preview.breakscreen.com  # Separate domain for preview environment
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: yuzu-web-preview  # Points to the preview service
            port:
              number: 80
```

**Explanation of Key Concepts**:
- **Preview Ingress**: Provides external access to the preview environment.
- **Separate Domain**: Uses a different domain name for the preview environment.

#### 5. overlays/blue-green/kustomization.yaml

This file defines the blue-green overlay:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:  # Resources to include
- ../../base  # Reference to the base directory
- services.yaml  # Blue-green specific services
- rollout.yaml  # Rollout definition
- analysis.yaml  # Analysis templates
- preview-ingress.yaml  # Preview ingress

patchesStrategicMerge:  # Patches to apply to resources from the base
- ingress-patch.yaml  # Patch to modify the base ingress
```

**Explanation of Key Concepts**:
- **resources**: List of files or directories to include.
- **../../base**: Reference to the base directory (relative path).
- **patchesStrategicMerge**: Patches to apply to resources from the base.

#### 6. overlays/blue-green/ingress-patch.yaml

This file patches the base ingress to point to the active service:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: yuzu-web  # Must match the name in the base ingress
spec:
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

**Explanation of Key Concepts**:
- **Patch**: A partial definition that modifies an existing resource.
- **Strategic Merge**: Kubernetes' way of merging patches with the original resource.
- **Service Change**: Updates the service backend to point to the active blue-green service.

#### 7. overlays/standard/kustomization.yaml

This simple overlay just uses the base components:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
- ../../base  # Just reference the base directory

# Add the deployment.yaml which was excluded from the base
patchesStrategicMerge:
- ../../base/deployment.yaml  # Include the standard deployment
```

**Explanation of Key Concepts**:
- **Standard Overlay**: An alternative to blue-green that uses standard deployments.
- **Inclusion of deployment.yaml**: Adds back the standard deployment that was excluded from the base.

## Implementing the Blue-Green Deployment Step-by-Step

Now that we understand all the components, let's walk through the implementation process step by step:

### 1. Create Directory Structure and Files

First, create the directory structure and all the necessary files:

```bash
# Create directory structure
mkdir -p k8s-deploy/base
mkdir -p k8s-deploy/overlays/blue-green
mkdir -p k8s-deploy/overlays/standard

# Create base files
touch k8s-deploy/base/deployment.yaml
touch k8s-deploy/base/service.yaml
touch k8s-deploy/base/ingress.yaml
touch k8s-deploy/base/kustomization.yaml

# Create blue-green files
touch k8s-deploy/overlays/blue-green/rollout.yaml
touch k8s-deploy/overlays/blue-green/services.yaml
touch k8s-deploy/overlays/blue-green/analysis.yaml
touch k8s-deploy/overlays/blue-green/preview-ingress.yaml
touch k8s-deploy/overlays/blue-green/ingress-patch.yaml
touch k8s-deploy/overlays/blue-green/kustomization.yaml

# Create standard files
touch k8s-deploy/overlays/standard/kustomization.yaml
```

### 2. Populate Configuration Files

Now, populate each file with the content provided in the previous section. You can use any text editor to create these files.

### 3. Apply TLS Secret for Certificates

Before deploying, ensure you have the TLS certificate secret created:

```bash
# If using existing certificate files
kubectl create secret tls breakscreen-tls \
  --cert=wildcard.breakscreen.com.crt \
  --key=wildcard.breakscreen.com.key

# Verify the secret
kubectl get secret breakscreen-tls
```

### 4. Create Argo CD Application for Blue-Green Deployment

Create an Argo CD application manifest:

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
      prune: true  # Automatically delete resources that are no longer in Git
      selfHeal: true  # Automatically sync if drift is detected
```

### 5. Apply the Application to Argo CD

```bash
kubectl apply -f yuzu-argocd-bluegreen-app.yaml
```

### 6. Configure DNS Records

Ensure DNS records are set up for both production and preview environments:

```
breakscreen.com -> [Traefik LoadBalancer IP]
www.breakscreen.com -> [Traefik LoadBalancer IP]
preview.breakscreen.com -> [Traefik LoadBalancer IP]
```

### 7. Initial Deployment

The initial deployment will create:
- The Rollout resource (equivalent to Deployment)
- Two services (active and preview)
- Two ingresses (main and preview)

Since it's the first deployment, both the active and preview services will point to the same pods.

### 8. Watch the Rollout

```bash
# Check rollout status
kubectl argo rollouts get rollout yuzu-web

# Open the dashboard for visualization
kubectl argo rollouts dashboard
```

## Testing, Monitoring, and Verifying Deployments

### How to Test the Deployment

After the initial deployment, you can access both environments:

- **Production (Current Active)**: https://breakscreen.com
- **Preview (For future releases)**: https://preview.breakscreen.com

### Manual Testing Steps

1. **Basic Smoke Tests**:
   ```bash
   # Test the health endpoint of both environments
   curl -k https://breakscreen.com/health
   curl -k https://preview.breakscreen.com/health
   ```

2. **Functional Testing**:
   - Log in to the application
   - Test critical workflows
   - Verify data consistency
   - Check performance metrics

### Automated Tests with Analysis Templates

The defined analysis templates will run automatically during the deployment:

1. **Pre-Promotion Tests**: Run on the preview environment before promotion.
2. **Post-Promotion Tests**: Run on the active environment after promotion.

You can manually trigger these tests:

```bash
# Create an AnalysisRun from a template
kubectl argo rollouts create analysisrun --from analysistemplate.argoproj.io/smoke-tests \
  --service-name yuzu-web-preview

# Check the status of an analysis
kubectl argo rollouts get analysisrun [name]
```

### Monitoring During Deployment

Monitor key metrics during the deployment process:

1. **Kubernetes Resources**:
   ```bash
   # Check pod status
   kubectl get pods -l app=yuzu-web
   
   # Check services
   kubectl get svc yuzu-web-active yuzu-web-preview
   
   # Check rollout status
   kubectl argo rollouts get rollout yuzu-web
   ```

2. **Application Logs**:
   ```bash
   # Get logs from active pods
   kubectl logs -l app=yuzu-web,role=active
   
   # Get logs from preview pods
   kubectl logs -l app=yuzu-web,role=preview
   ```

3. **Metrics and Dashboards**:
   - If you have Prometheus and Grafana set up, monitor application metrics
   - Use built-in Kubernetes dashboards to monitor resource usage

### Verifying a Successful Deployment

Before promoting a new version, verify:

1. **All pods are running**: `kubectl get pods -l app=yuzu-web`
2. **Health checks pass**: Access health endpoints
3. **Automated tests pass**: Analysis runs complete successfully
4. **Manual tests pass**: Key functionality works as expected
5. **No errors in logs**: Check application logs for errors
6. **Normal resource usage**: CPU, memory, and network metrics look normal

## Rollback Procedures and Recovery

### Aborting a Deployment Before Promotion

If you detect issues in the preview environment before promotion:

```bash
# Abort the rollout
kubectl argo rollouts abort yuzu-web

# Verify the status
kubectl argo rollouts get rollout yuzu-web
```

This will:
1. Stop the deployment process
2. Keep the current version active
3. Scale down the preview pods

### Rolling Back After Promotion

If issues are detected after promoting to the new version:

```bash
# Rollback to the previous revision
kubectl argo rollouts undo yuzu-web

# Alternatively, rollback to a specific revision
kubectl argo rollouts undo yuzu-web --to-revision=2

# Verify the status
kubectl argo rollouts get rollout yuzu-web
```

This will:
1. Switch traffic back to the previous version
2. Scale down the problematic version
3. Return the system to the previous known-good state

### Manual Recovery Steps

In case the automated rollback fails:

1. **Manual Service Switch**:
   ```bash
   # Edit the active service to point to the previous ReplicaSet
   kubectl edit svc yuzu-web-active
   ```

2. **Force Revision**:
   ```bash
   # Patch the rollout to use a specific revision
   kubectl patch rollout yuzu-web --type merge -p '{"status":{"currentPodHash":"<previous-hash>"}}'
   ```

3. **Emergency Scaling**:
   ```bash
   # Scale down problematic pods
   kubectl scale replicaset <problematic-rs> --replicas=0
   
   # Scale up previous pods
   kubectl scale replicaset <previous-rs> --replicas=2
   ```

### Recovering from Database Issues

If the rollback involves database schema changes:

1. **Review Schema Changes**: Evaluate if automated rollback is safe for the database
2. **Backup Data**: Take a backup before attempting rollback
3. **Versioned Migrations**: If using migration tools, roll back to the previous schema version
4. **Manual Intervention**: In complex cases, manual database intervention may be required

## Automating the Blue-Green Deployment Process

### CI/CD Pipeline Integration

Integrate the blue-green deployment process into your CI/CD pipeline:

#### GitHub Actions Example

```yaml
# .github/workflows/deploy.yml
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
      - name: Checkout code
        uses: actions/checkout@v2
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v1
      
      - name: Login to Scaleway Container Registry
        uses: docker/login-action@v1
        with:
          registry: rg.fr-par.scw.cloud
          username: ${{ secrets.SCW_REGISTRY_NAMESPACE }}
          password: ${{ secrets.SCW_SECRET_KEY }}
      
      - name: Build and push Docker image
        uses: docker/build-push-action@v2
        with:
          context: .
          push: true
          tags: rg.fr-par.scw.cloud/cr-yuzu-par-1/yuzu-web:${{ github.sha }}
      
      - name: Update Rollout manifest
        run: |
          # Install yq for YAML processing
          wget https://github.com/mikefarah/yq/releases/download/v4.13.2/yq_linux_amd64 -O /usr/local/bin/yq
          chmod +x /usr/local/bin/yq
          
          # Update image in rollout.yaml
          yq e '.spec.template.spec.containers[0].image = "rg.fr-par.scw.cloud/cr-yuzu-par-1/yuzu-web:${{ github.sha }}"' -i k8s-deploy/overlays/blue-green/rollout.yaml
          
          # Commit the updated manifest
          git config --global user.name "GitHub Actions"
          git config --global user.email "actions@github.com"
          git add k8s-deploy/overlays/blue-green/rollout.yaml
          git commit -m "Update rollout image to ${{ github.sha }}"
          git push
```

### Automated Testing and Promotion

To fully automate the deployment process:

1. **Enable Auto-Promotion**: Set `autoPromotionEnabled: true` in the rollout.yaml
2. **Add Comprehensive Tests**: Expand the analysis templates with thorough tests
3. **Notifications**: Add notification hooks for deployment events

Example of rollout with auto-promotion:

```yaml
strategy:
  blueGreen:
    activeService: yuzu-web-active
    previewService: yuzu-web-preview
    autoPromotionEnabled: true  # Enable automatic promotion
    autoPromotionSeconds: 600   # Wait 10 minutes before auto-promoting
    prePromotionAnalysis:
      templates:
      - templateName: comprehensive-tests
      args:
      - name: service-name
        value: yuzu-web-preview
```

### Scheduled vs. Manual Promotions

Choose the right promotion strategy based on your needs:

1. **Fully Automated**: Great for frequent, low-risk changes. Enable auto-promotion with comprehensive tests.
2. **Semi-Automated**: Deploy automatically, but require manual approval for promotion. Good for critical systems.
3. **Fully Manual**: Deploy and promote manually. Suitable for major releases or high-risk changes.

For manual approval workflow with notifications:

```yaml
strategy:
  blueGreen:
    # ... other settings ...
    autoPromotionEnabled: false  # Disable auto-promotion
    prePromotionAnalysis:
      templates:
      - templateName: smoke-tests
      - templateName: notification
        clusterScope: true  # Use a cluster-scoped template
```

Where the notification template sends alerts to your team:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ClusterAnalysisTemplate
metadata:
  name: notification
spec:
  metrics:
  - name: send-slack-notification
    provider:
      web:
        url: https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
        jsonPath: "{$.success}"
        method: POST
        body: |
          {
            "text": "New version is ready for review at https://preview.breakscreen.com. Run 'kubectl argo rollouts promote yuzu-web' to go live."
          }
```

## Advanced Considerations and Best Practices

### Database Migrations and Backward Compatibility

When deploying applications with database changes:

1. **Backward-Compatible Changes**: Ensure new application version works with old schema.
2. **Forward-Compatible Changes**: Ensure old application version works with new schema.
3. **Migration Sequence**:
   - Add new fields/tables (but don't require them in old code)
   - Deploy new application version
   - Once stable, clean up unused fields/tables

Example approach for safe migrations:

```
1. Start with schema V1 and app V1
2. Add new fields to schema (V1 -> V2), but don't remove anything
3. Deploy app V2 that can use new fields but doesn't require them
4. Verify app V2 is stable
5. Deploy app V3 that requires the new fields
6. Remove old unused fields from schema (V2 -> V3)
```

### Handling Stateful Applications

For applications that maintain state:

1. **Session Persistence**: Use one of these strategies:
   - External session store (Redis, database)
   - Sticky sessions (less ideal for blue-green)
   - JWT or client-side session storage

2. **Connection Draining**: Allow existing connections to complete before removing old pods:
   ```yaml
   spec:
     strategy:
       blueGreen:
         scaleDownDelaySeconds: 300  # Give 5 minutes for connections to drain
   ```

3. **State Transfer**: For applications with in-memory state, implement state transfer mechanisms.

### Optimizing Resource Usage

To minimize resource usage during deployments:

1. **Scale Based on Environment**: Use different replica counts for different environments:
   ```yaml
   spec:
     replicas: 2  # Production replicas
   ```

2. **Anti-Affinity Rules**: Spread pods across nodes for better resilience:
   ```yaml
   spec:
     template:
       spec:
         affinity:
           podAntiAffinity:
             preferredDuringSchedulingIgnoredDuringExecution:
             - weight: 100
               podAffinityTerm:
                 labelSelector:
                   matchLabels:
                     app: yuzu-web
                 topologyKey: kubernetes.io/hostname
   ```

3. **Resource Limits**: Set appropriate CPU and memory limits to prevent resource contention.

### Multi-Region and High Availability Considerations

For critical applications requiring high availability:

1. **Multi-Cluster Deployment**: Set up clusters in multiple regions.
2. **Global Traffic Management**: Use global load balancing (like CloudFlare or AWS Global Accelerator).
3. **Progressive Rollouts**: Roll out changes to one region at a time.
4. **Cross-Region Testing**: Implement tests that verify cross-region functionality.

### Security Considerations

Ensure security throughout the deployment process:

1. **Secret Management**: Store secrets securely (Kubernetes Secrets, Vault).
2. **Network Policies**: Restrict communication between pods:
   ```yaml
   apiVersion: networking.k8s.io/v1
   kind: NetworkPolicy
   metadata:
     name: yuzu-web-policy
   spec:
     podSelector:
       matchLabels:
         app: yuzu-web
     ingress:
     - from:
       - podSelector:
           matchLabels:
             app: allowed-client
       ports:
       - protocol: TCP
         port: 8080
   ```

3. **Service Accounts**: Use minimal permissions:
   ```yaml
   spec:
     template:
       spec:
         serviceAccountName: yuzu-web-restricted
   ```

4. **Image Scanning**: Scan for vulnerabilities before deployment.

## Troubleshooting Common Issues

### Rollout Stuck in Pending State

**Symptoms**: Rollout doesn't proceed beyond the "Pending" state.

**Possible Causes and Solutions**:

1. **Resource Constraints**:
   - Check node resources: `kubectl describe nodes`
   - Consider scaling cluster or reducing resource requests

2. **Image Pull Issues**:
   - Check pod events: `kubectl describe pod <pod-name>`
   - Verify registry credentials: `kubectl get secret scaleway-registry-credentials`

3. **ConfigMap or Secret Missing**:
   - Check for missing ConfigMaps/Secrets in pod events
   - Create missing resources: `kubectl create secret/configmap ...`

### Analysis Runs Failing

**Symptoms**: Analysis runs consistently fail, preventing promotion.

**Possible Causes and Solutions**:

1. **Test Failures**:
   - Check analysis run details: `kubectl describe analysisrun <name>`
   - Investigate specific test failures in logs

2. **Network Issues**:
   - Verify network connectivity to test endpoints
   - Check network policies that might block test traffic

3. **Resource Limitations**:
   - Check if analysis pods have sufficient resources
   - Review analysis template resources settings

### Service Routing Problems

**Symptoms**: Traffic not reaching correct pods, 404 errors, or inconsistent routing.

**Possible Causes and Solutions**:

1. **Selector Issues**:
   - Verify service selectors match pod labels: `kubectl describe svc yuzu-web-active`
   - Check actual pod labels: `kubectl get pods --show-labels`

2. **Ingress Configuration**:
   - Check ingress rules: `kubectl describe ingress yuzu-web`
   - Verify Traefik routing rules

3. **DNS Resolution**:
   - Verify DNS records point to the correct IP
   - Test resolution: `nslookup breakscreen.com`

### Rollback Failures

**Symptoms**: Unable to roll back to a previous version.

**Possible Causes and Solutions**:

1. **Missing History**:
   - Check available revisions: `kubectl argo rollouts get rollout yuzu-web`
   - Increase `revisionHistoryLimit` in rollout definition

2. **Outdated ConfigMaps/Secrets**:
   - Verify old ConfigMaps/Secrets still exist
   - Recreate missing resources from backup

3. **Incompatible Database Schema**:
   - Review database migration logs
   - Apply schema fixes manually if needed

## FAQs and Reference Information

### FAQ

1. **How does Blue-Green differ from Canary deployments?**
   - Blue-Green switches traffic all at once, while Canary gradually shifts traffic.
   - Blue-Green requires twice the resources during transition.
   - Canary provides more granular control over traffic percentages.

2. **Can I use Blue-Green with limited resources?**
   - Yes, with a smaller number of replicas or by using node auto-scaling.
   - Consider reducing resource requests temporarily during deployments.

3. **How long should I wait before promotion?**
   - Depends on your application's complexity and risk profile.
   - Typically range from minutes (for well-tested changes) to hours or days (for critical systems).

4. **How do I handle database migrations?**
   - Always use backward-compatible changes.
   - Apply migrations before code changes that depend on them.
   - Have a rollback plan for every migration.

5. **What if I need to revert to a version from several releases ago?**
   - Use `kubectl argo rollouts undo yuzu-web --to-revision=X` to specify the revision.
   - Ensure all dependencies (ConfigMaps, Secrets, etc.) for that version still exist.

### Reference Information

#### Key Argo Rollouts Commands

```bash
# Get rollout status
kubectl argo rollouts get rollout <name>

# Watch rollout progress
kubectl argo rollouts get rollout <name> --watch

# Promote a rollout
kubectl argo rollouts promote <name>

# Abort a rollout
kubectl argo rollouts abort <name>

# Undo a rollout
kubectl argo rollouts undo <name>

# List rollout history
kubectl argo rollouts get rollout <name> --history

# Start dashboard
kubectl argo rollouts dashboard
```

#### Important Metrics to Monitor

- **Application Health**:
  - Request success rate
  - Error rate
  - Response time
  - Throughput

- **System Health**:
  - CPU and memory usage
  - Network I/O
  - Disk I/O
  - Pod restarts

- **Deployment Metrics**:
  - Deployment duration
  - Rollback frequency
  - Success/failure rate

#### Useful Resources

- [Argo Rollouts Documentation](https://argoproj.github.io/argo-rollouts/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Kustomize Documentation](https://kubectl.docs.kubernetes.io/guides/introduction/kustomize/)
- [Traefik Documentation](https://doc.traefik.io/traefik/)
- [Blue-Green Deployment Pattern](https://martinfowler.com/bliki/BlueGreenDeployment.html) by Martin Fowler

## Conclusion

Blue-Green deployments with Argo CD provide a robust mechanism for deploying applications with minimal risk and downtime. By following this guide, you can implement a sophisticated deployment strategy that ensures reliability, testability, and rapid recovery in case of issues.

Remember that blue-green deployments are just one tool in your deployment toolkit. The right approach depends on your specific application requirements, team capabilities, and infrastructure constraints.