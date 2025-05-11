# Deployment Setup Guide

This document explains how to set up the deployment workflow that updates Kubernetes manifests in the YuzuDeploy repository.

## Pre-requisites

1. A Gitea runner with Docker installed
2. SSH key access to the YuzuDeploy repository
3. Proper secrets configured in your Gitea repository
4. ArgoCD set up to monitor the YuzuDeploy repository

## Required Secrets

Add the following secrets to your Gitea repository:

1. `SCW_SECRET_KEY` - Your Scaleway registry secret key
2. `RSA_SSH_KEY` - An RSA SSH private key with write access to the YuzuDeploy repository

## Generating a Dedicated SSH Key for Deployment

Generate a new SSH key pair specifically for deployment:

```bash
# RSA key (4096 bit, unencrypted)
ssh-keygen -t rsa -b 4096 -C "yuzu-deploy-key" -f ./id_rsa -N ""
```

**IMPORTANT**: The key MUST be generated WITHOUT a passphrase for CI/CD use.

2. Add the public key as a deploy key in your YuzuDeploy repository:
   - Go to YuzuDeploy repository settings
   - Find "Deploy Keys" section
   - Add a new deploy key with the content of the public key file (`.pub`)
   - Make sure to check "Allow write access"
   - Give it a descriptive title like "Yuzu CI Deployment Key"

3. Add the private key content as a secret in your Yuzu repository:
   - Go to your Yuzu repository settings
   - Navigate to "Secrets"
   - Add a new secret named `RSA_SSH_KEY`
   - Paste the content of the private key file

## How It Works

The workflow:

1. Installs required tools (openssh-client) for Alpine Linux containers
2. Builds and pushes Docker images to the Scaleway registry
3. Sets up the SSH key for Git operations
4. Clones the YuzuDeploy repository using the correct port (29418)
5. Updates the image tag in the deployment files
6. Commits and pushes the changes
7. ArgoCD detects the changes and automatically deploys the new version

This enables automatic updates to your Kubernetes deployment files whenever a new image is built.

## Gitea SSH Server Configuration

The Gitea server is configured with the following settings:

1. Non-standard SSH port: **29418**
2. Case-sensitive repository names
3. SSH URL format for cloning: `ssh://git@gitea.watermelonsoft.eu:29418/Yuzu/YuzuDeploy.git`

## Troubleshooting

If the workflow fails at the Git or SSH steps:

1. **SSH Port**: Ensure you're using port 29418 instead of the default port 22:
   ```bash
   GIT_SSH_COMMAND="ssh -i /path/to/key -p 29418 -o IdentitiesOnly=yes"
   ```

2. **Repository Path**: Check that you're using the correct case-sensitive path:
   - Correct: `Yuzu/YuzuDeploy`
   - Incorrect: `yuzu/yuzudeploy`

3. **SSH Key Format**: Make sure the SSH key:
   - Has no passphrase
   - Has correct line endings (unix format)
   - Has proper permissions (600)

4. **SSH URL Format**: When using a non-standard port:
   ```
   ssh://git@gitea.watermelonsoft.eu:29418/Yuzu/YuzuDeploy.git
   ```

5. **Debugging**: Use the SSH connection test workflow to troubleshoot:
   ```bash
   ssh -vvv -i /path/to/key -p 29418 git@gitea.watermelonsoft.eu
   ```

## ArgoCD Integration

After the workflow updates the deployment manifest in the YuzuDeploy repository:

1. ArgoCD detects changes to the manifest files
2. ArgoCD compares the desired state (in Git) with the current state (in Kubernetes)
3. If differences are found, ArgoCD synchronizes the cluster with the desired state
4. The new version of the application is deployed automatically

To monitor the deployment process:
1. Log into the ArgoCD dashboard
2. Navigate to the Yuzu application
3. Check synchronization status and application health