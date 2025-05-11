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

## Generating a Dedicated SSH Key for Deployment

1. Generate a new SSH key pair specifically for deployment:

```bash
ssh-keygen -t ed25519 -C "yuzu-deploy-key" -f ./deploy_key
```

2. Add the public key as a deploy key in your YuzuDeploy repository:
   - Go to YuzuDeploy repository settings
   - Find "Deploy Keys" section
   - Add a new deploy key with the content of `deploy_key.pub`
   - Make sure to check "Allow write access"
   - Give it a descriptive title like "Yuzu CI Deployment Key"

3. Add the private key content as the `DEPLOY_SSH_KEY` secret in your Yuzu repository:
   - Go to your Yuzu repository settings
   - Navigate to "Secrets"
   - Add a new secret named `DEPLOY_SSH_KEY`
   - Paste the content of the `deploy_key` private key file

## How It Works

The workflow:

1. Checks if git is installed, installs it if needed (for Alpine Linux)
2. Builds and pushes Docker images to the Scaleway registry
3. Sets up SSH key for Git operations
4. Clones the YuzuDeploy repository
5. Updates the image tag in the deployment files
6. Commits and pushes the changes

This enables automatic updates to your Kubernetes deployment files whenever a new image is built.

## Troubleshooting

If the workflow fails at the Git or SSH steps:

1. Verify that the SSH key has been added as a deploy key in the YuzuDeploy repository
2. Ensure the deploy key has write access enabled
3. Check that the SSH private key has been properly added as a secret
4. Make sure the repository URL in the workflow file is correct
5. Confirm the runner has outbound SSH access (port 22) to your Gitea server

If the connection fails even with correct settings, you might need to modify your Gitea server's SSH settings or consider using an HTTP-based approach with a machine user account.