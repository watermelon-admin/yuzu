# Yuzu CI/CD Workflows

This directory contains CI/CD workflows for the Yuzu project.

## Available Workflows

### 1. Build, Push and Deploy (`build-push-deploy.yml`)

This workflow builds, pushes Docker images, and updates deployment manifests.

#### Workflow Parameters

- `ssh_key_type`: Select which key type to use (rsa or ed25519)

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

### 3. Test Repository Access (`test-repo-access.yml`)

This workflow is specifically for testing SSH repository access and cloning.

#### Workflow Parameters

- `ssh_key_type`: Select which key type to use (rsa or ed25519)
- `skip_ssh_test`: Whether to skip the initial SSH connection test (true/false)

#### Workflow Steps

1. Sets up the selected SSH key
2. Tests SSH connectivity to Gitea
3. Attempts to clone the YuzuDeploy repository

### 4. Test With Correct Port (`test-with-correct-port.yml`)

Tests SSH connectivity using port 29418 specifically.

### 5. Test Correct Repository (`test-correct-repo.yml`)

Tests cloning the YuzuDeploy repository with the correct case-sensitive path.

### 6. Generate SSH Key (`generate-ssh-key.yml`)

Generates unencrypted SSH keys for use in CI/CD workflows.

## Setting Up SSH Keys

The workflows support two types of SSH keys for repository authentication:

1. RSA keys (`RSA_SSH_KEY` secret)
2. ED25519 keys (`DEPLOY_SSH_KEY` secret)

### Important Notes

- SSH keys for CI/CD should be **unencrypted** (no passphrase)
- The Gitea server uses a non-standard port (29418) for SSH connections
- The repository path must use the correct case: `Yuzu/YuzuDeploy`

### Generating Unencrypted SSH Keys

```bash
# For RSA keys
ssh-keygen -t rsa -b 4096 -f yuzu_deploy_rsa -N ""

# For ED25519 keys
ssh-keygen -t ed25519 -f yuzu_deploy_ed25519 -N ""
```

### Adding SSH Keys to Gitea

1. Generate or use an existing SSH key pair
2. Add the **private key** as a secret in the Yuzu repository:
   - Go to repository settings → Secrets
   - Add a new secret named `RSA_SSH_KEY` or `DEPLOY_SSH_KEY`
   - Paste the private key content
3. Add the **public key** to your Gitea user account:
   - Go to user settings → SSH Keys
   - Add a new key with the public key content

## Required Secrets

- `SCW_SECRET_KEY`: Your Scaleway Secret Key for container registry authentication
- `RSA_SSH_KEY`: Private RSA key for SSH authentication (if using RSA)
- `DEPLOY_SSH_KEY`: Private ED25519 key for SSH authentication (if using ED25519)

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