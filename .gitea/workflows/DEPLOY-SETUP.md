# Deployment Setup Guide

This document explains how to set up the deployment workflow that updates Kubernetes manifests in the YuzuDeploy repository.

## Pre-requisites

1. A Gitea runner with Docker installed
2. SSH key access to the YuzuDeploy repository
3. Proper secrets configured in your Gitea repository

## Required Secrets

Add the following secrets to your Gitea repository:

1. `SCW_SECRET_KEY` - Your Scaleway registry secret key
2. `DEPLOY_SSH_KEY` - An SSH private key with write access to the YuzuDeploy repository

## Generating an SSH Key for Deployment

1. Generate a new SSH key pair:

```bash
ssh-keygen -t ed25519 -C "yuzu-deployment-key" -f ./deploy_key
```

2. Add the public key (`deploy_key.pub`) to your YuzuDeploy repository as a deploy key with write access

3. Add the private key content as the `DEPLOY_SSH_KEY` secret in your Yuzu repository

## Configuring the Workflow

Before using the workflow, you need to update:

1. The Git server hostname in the SSH keyscan command:
   ```yaml
   ssh-keyscan -t rsa your-gitea-server.example.com >> ~/.ssh/known_hosts
   ```

2. The repository URL in the clone command:
   ```yaml
   git clone git@your-gitea-server.example.com:YourUsername/YuzuDeploy.git deploy-repo
   ```

Replace `your-gitea-server.example.com` and `YourUsername` with your actual Gitea server hostname and username.

## How It Works

The workflow:

1. Checks if git is installed, installs it if needed (for Alpine Linux)
2. Builds and pushes Docker images to the Scaleway registry
3. Sets up SSH access to the deployment repo
4. Clones the YuzuDeploy repository
5. Updates the image tag in the deployment files
6. Commits and pushes the changes

This enables automatic updates to your Kubernetes deployment files whenever a new image is built.

## Troubleshooting

If the workflow fails at the Git or SSH steps:

1. Check that your SSH key has proper permissions (should be `0600`)
2. Verify the SSH key has write access to the YuzuDeploy repository
3. Make sure the repository URL is correct
4. Confirm that the runner has outbound SSH access (port 22) to your Gitea server