#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Installing Traefik...${NC}"
helm repo add traefik https://traefik.github.io/charts
helm repo update
helm install traefik traefik/traefik   --namespace traefik   --create-namespace   -f traefik/values.yaml

echo -e "${BLUE}Waiting for Traefik to start...${NC}"
kubectl wait --namespace traefik   --for=condition=ready pod   --selector=app.kubernetes.io/name=traefik   --timeout=90s

echo -e "${BLUE}Creating middleware...${NC}"
kubectl apply -f app/middleware.yaml

echo -e "${BLUE}Creating application service...${NC}"
kubectl apply -f app/service.yaml

echo -e "${BLUE}Creating application deployment...${NC}"
kubectl apply -f app/deployment.yaml

echo -e "${BLUE}Creating ingress...${NC}"
kubectl apply -f app/ingress.yaml

echo -e "${BLUE}Waiting for LoadBalancer IP...${NC}"
while [ -z $(kubectl get service -n traefik traefik -o jsonpath='{.status.loadBalancer.ingress[0].hostname}') ]; do
  echo "Waiting for LoadBalancer..."
  sleep 5
done

echo -e "${GREEN}Deployment complete!${NC}"
echo -e "LoadBalancer hostname: $(kubectl get service -n traefik traefik -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')"
echo -e "Please configure your DNS records to point to this hostname."
