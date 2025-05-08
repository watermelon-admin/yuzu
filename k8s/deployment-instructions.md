# Yuzu Deployment Instructions for Scaleway Kubernetes

## 1. Configure kubectl

To connect to your Scaleway Kubernetes cluster, you need to get the kubeconfig file with your authentication token:

```bash
# Get the kubeconfig from Scaleway console or API
# Place it in ~/.kube/config or use it with --kubeconfig flag

# Test the connection
export KUBECONFIG=/mnt/d/Repos/yuzu/k8s/scaleway-kubeconfig.yaml
kubectl get nodes
```

## 2. Create Registry Secret

To allow Kubernetes to pull images from your Scaleway Container Registry:

```bash
# Create docker config json with your credentials
# Replace username and password with your actual Scaleway credentials
kubectl create secret docker-registry scaleway-registry-credentials \
  --docker-server=rg.fr-par.scw.cloud \
  --docker-username=YOUR_REGISTRY_USERNAME \
  --docker-password=YOUR_REGISTRY_PASSWORD

# Alternatively, if you have a Docker config.json file:
# kubectl create secret generic scaleway-registry-credentials \
#  --from-file=.dockerconfigjson=/path/to/config.json \
#  --type=kubernetes.io/dockerconfigjson
```

## 3. Create Application Secrets

```bash
# Apply the secrets configuration
kubectl apply -f /mnt/d/Repos/yuzu/k8s/yuzu-secrets.yaml

# Make sure to update the secrets with your production values first!
```

## 4. Deploy the Application

```bash
# Apply the deployment
kubectl apply -f /mnt/d/Repos/yuzu/k8s/scaleway-yuzu-deployment.yaml

# Apply the service and ingress
kubectl apply -f /mnt/d/Repos/yuzu/k8s/scaleway-yuzu-service.yaml

# Check deployment status
kubectl get deployments
kubectl get pods
kubectl get services
kubectl get ingress
```

## 5. Debugging

If you encounter issues:

```bash
# Check pod status
kubectl get pods

# View pod logs
kubectl logs pod/yuzu-web-pod-name

# Describe the pod for detailed information
kubectl describe pod/yuzu-web-pod-name

# Check deployment events
kubectl describe deployment yuzu-web
```

## 6. Access the Application

Once deployed, your application will be available through the Ingress controller.

If you've configured a domain name in your Ingress, make sure your DNS points to the Ingress controller's external IP address.

## 7. Updating the Deployment

When you push a new image to the registry:

```bash
# Update to new image version (if you've changed the tag)
kubectl set image deployment/yuzu-web yuzu-web=rg.fr-par.scw.cloud/cr-yuzu-par-1/yuzu-web:new-tag

# Or force a rollout with the same image (if using :latest tag)
kubectl rollout restart deployment/yuzu-web
```