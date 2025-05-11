# Deployment Setup Guide

This document explains how to set up the deployment workflow that updates Kubernetes manifests in the YuzuDeploy repository.

## Pre-requisites

1. A Gitea runner with Docker installed
2. Access to the YuzuDeploy repository via Personal Access Token (PAT)
3. Proper secrets configured in your Gitea repository

## Required Secrets

Add the following secrets to your Gitea repository:

1. `SCW_SECRET_KEY` - Your Scaleway registry secret key
2. `DEPLOY_PAT` - A Personal Access Token with write access to the YuzuDeploy repository

## Creating a Personal Access Token (PAT)

1. Go to your user settings in Gitea (click your profile picture > Settings)
2. Navigate to "Applications" or "Access Tokens"
3. Click "Generate New Token"
4. Give it a descriptive name like "YuzuDeploy-CI"
5. Select permissions: at minimum, check "repo" access
6. Click "Generate Token"
7. **Copy the generated token immediately** (you won't be able to see it again)
8. Add this token as the `DEPLOY_PAT` secret in your Yuzu repository settings

## Configuring the Workflow

Before using the workflow, you need to update the repository URL in the clone command to match your Gitea server address and organization/username:

```yaml
git clone https://${DEPLOY_PAT}@your-gitea-server.example.com/YourUsername/YuzuDeploy.git deploy-repo
```

Replace `your-gitea-server.example.com` and `YourUsername` with your actual Gitea server hostname and username. For example:

```yaml
git clone https://${DEPLOY_PAT}@gitea.example.org/DevOps/YuzuDeploy.git deploy-repo
```

## How It Works

The workflow:

1. Checks if git is installed, installs it if needed (for Alpine Linux)
2. Builds and pushes Docker images to the Scaleway registry
3. Clones the YuzuDeploy repository using the Personal Access Token
4. Updates the image tag in the deployment files
5. Commits and pushes the changes

This enables automatic updates to your Kubernetes deployment files whenever a new image is built.

## Troubleshooting

If the workflow fails at the Git or repository access steps:

1. Check that your Personal Access Token hasn't expired
2. Verify the PAT has write access to the YuzuDeploy repository
3. Make sure the repository URL is correct (including the domain and username/organization)
4. Confirm that the Gitea user associated with the PAT has appropriate permissions
5. Check that your runner has outbound HTTPS access (port 443) to your Gitea server