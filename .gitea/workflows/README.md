# Yuzu CI/CD Workflows

This directory contains CI/CD workflows for the Yuzu project.

## Available Workflows

### 1. Build, Push and Deploy (`build-push-deploy.yml`)

This workflow builds, pushes Docker images, and updates deployment manifests.

#### Workflow Parameters

- No parameters required (uses RSA key automatically)

#### Workflow Steps

1. Builds a Docker image for Yuzu
2. Pushes the image to the Scaleway registry
3. Updates the deployment manifests in the YuzuDeploy repository
4. Triggers ArgoCD to deploy the new version (via Git repository changes)

### 2. Build and Push Docker Image Only (`build-push-image.yml`)

This workflow only builds and pushes Docker images without deployment steps.

#### Workflow Steps

1. Builds a Docker image for Yuzu
2. Pushes the image to the Scaleway registry

### 3. Generate SSH Key (`generate-ssh-key.yml`)

Utility workflow for generating unencrypted SSH keys for CI/CD use.

#### Workflow Steps

1. Generates an RSA key without passphrase
2. Displays the public key for adding to Gitea

## Setting Up SSH Keys

The workflow uses RSA keys for repository authentication:

### Important Notes

- SSH key for CI/CD should be **unencrypted** (no passphrase)
- The Gitea server uses a non-standard port (29418) for SSH connections
- The repository path must use the correct case: `Yuzu/YuzuDeploy`

### Generating Unencrypted SSH Key

```bash
# Generate RSA key without passphrase
ssh-keygen -t rsa -b 4096 -f id_rsa -N "" -C "yuzu-deploy-key"
```

You can also use the `generate-ssh-key.yml` workflow to generate a key for you.

### Adding SSH Key to Gitea

1. Generate an unencrypted RSA key pair
2. Add the **private key** as a secret in the Yuzu repository:
   - Go to repository settings → Secrets
   - Add a new secret named `RSA_SSH_KEY`
   - Paste the private key content
3. Add the **public key** to the YuzuDeploy repository:
   - Go to YuzuDeploy repository settings → Deploy Keys
   - Add a new deploy key with the public key content
   - Make sure to check "Allow write access"

## Required Secrets

- `SCW_SECRET_KEY`: Your Scaleway Secret Key for container registry authentication
- `RSA_SSH_KEY`: Private RSA key for SSH authentication

## Troubleshooting

If you encounter SSH authentication issues:

1. **Incorrect Port**: Make sure to use port 29418 instead of the default port 22
   ```bash
   GIT_SSH_COMMAND="ssh -i /path/to/key -p 29418 -o IdentitiesOnly=yes"
   ```

2. **Repository Path**: Use the correct case-sensitive repository path:
   - Correct: `Yuzu/YuzuDeploy`
   - Incorrect: `yuzu/yuzudeploy`

3. **SSH URL Format**: For non-standard ports, use:
   ```
   ssh://git@gitea.watermelonsoft.eu:29418/Yuzu/YuzuDeploy.git
   ```

4. **Key Issues**: If encountering "Invalid key format" errors, check:
   - Key has no passphrase
   - No line ending issues (Windows vs. Unix)
   - Key permissions are correct (600)

### Debugging Commands

```bash
# Test SSH connection
ssh -vvv -i /path/to/key -p 29418 git@gitea.watermelonsoft.eu

# Clone with explicit SSH command
GIT_SSH_COMMAND="ssh -i /path/to/key -p 29418 -o IdentitiesOnly=yes -o StrictHostKeyChecking=no" \
git clone ssh://git@gitea.watermelonsoft.eu:29418/Yuzu/YuzuDeploy.git
```

## ArgoCD Integration

Once the workflow updates the deployment manifest in the YuzuDeploy repository, ArgoCD will automatically detect the changes and deploy the new version of the application.

To monitor the deployment:
1. Log into the ArgoCD dashboard
2. Navigate to the Yuzu application
3. Check the synchronization status and application health