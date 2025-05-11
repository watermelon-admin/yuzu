# Yuzu CI/CD Workflows

This directory contains CI/CD workflows for the Yuzu project.

## Available Workflows

### 1. Test Repository Access (`test-repo-access.yml`)

This workflow is specifically for testing SSH repository access and cloning.

#### Workflow Parameters

- `ssh_key_type`: Select which key type to use (rsa or ed25519)
- `skip_ssh_test`: Whether to skip the initial SSH connection test (true/false)

#### Workflow Steps

1. Sets up the selected SSH key
2. Tests SSH connectivity to Gitea
3. Attempts to clone the YuzuDeploy repository

### 2. Build, Push and Deploy (`build-push-deploy.yml`)

This workflow builds, pushes Docker images, and updates deployment manifests.

#### Workflow Parameters

- `ssh_key_type`: Select which key type to use (rsa or ed25519)

#### Workflow Steps

1. Builds a Docker image for Yuzu
2. Pushes the image to the Scaleway registry
3. Updates the deployment manifests in the YuzuDeploy repository

### 3. Build and Push Docker Image Only (`build-push-image.yml`)

This workflow only builds and pushes Docker images without deployment steps.

#### Workflow Steps

1. Builds a Docker image for Yuzu
2. Pushes the image to the Scaleway registry

## Setting Up SSH Keys

The workflows support two types of SSH keys for repository authentication:

1. RSA keys (`RSA_SSH_KEY` secret)
2. ED25519 keys (`DEPLOY_SSH_KEY` secret)

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

1. Run the `test-with-correct-port.yml` workflow to diagnose connection problems
2. Check that the SSH key has been added correctly to your Gitea account
3. Verify the key fingerprints match between your account and the workflow output
4. Ensure the repository URL is correct and uses port 29418 in the workflow files
5. Remember to use the SSH URL format: `ssh://git@gitea.watermelonsoft.eu:29418/path/to/repo.git`