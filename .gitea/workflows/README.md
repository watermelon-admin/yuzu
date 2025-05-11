# Gitea CI/CD Workflows

This directory contains Gitea workflow configurations for automating the build and deployment processes.

## Available Workflows

### Build and Push Docker Image (`build-push-image.yml`)

This workflow automatically builds and pushes the Yuzu application Docker image to the Scaleway Container Registry.

#### Workflow Triggers

The workflow runs:
- On every push to the `main` branch
- When a new tag with prefix `v` is pushed (e.g., `v1.0.0`, `v2.3.1`)
- Manually via workflow dispatch

#### Workflow Steps

1. Check out the repository code
2. Set up Docker Buildx for multi-platform builds
3. Generate a version tag (from Git tag or commit SHA)
4. Log in to Scaleway Container Registry using the `SCW_SECRET_KEY` secret
5. Build and push the Docker image with two tags:
   - `latest`
   - Version-specific tag (either the Git tag without 'v' prefix or short commit SHA)
6. Uses GitHub cache to speed up subsequent builds

#### Required Secrets

- `SCW_SECRET_KEY`: Your Scaleway Secret Key for authenticating with the container registry

#### How to Use

1. **For regular development:**
   - Push changes to the `main` branch
   - The image will be built and pushed with tag format: `rg.fr-par.scw.cloud/cr-yuzu-par-1/yuzu-web:<commit-sha>`

2. **For releases:**
   - Create and push a version tag: `git tag v1.0.0 && git push origin v1.0.0`
   - The image will be built and pushed with tag format: `rg.fr-par.scw.cloud/cr-yuzu-par-1/yuzu-web:1.0.0`

3. **For manual runs:**
   - Go to Actions tab in Gitea
   - Select "Build and Push Docker Image" workflow
   - Click "Run workflow"

#### Customizing the Workflow

- Edit `.gitea/workflows/build-push-image.yml` to modify build parameters or add additional steps
- Adjust the registry path (`rg.fr-par.scw.cloud/cr-yuzu-par-1`) if needed