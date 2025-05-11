# Setting Up Secrets for Gitea Workflows

This guide explains how to set up the required secret for the Gitea CI/CD workflow in this repository.

## Required Secret

For the Docker image build and push workflow, you need to set up:

- `SCW_SECRET_KEY`: Your Scaleway Secret Key for authenticating with the container registry

## Setting Up the Secret in Gitea

1. In your Gitea web interface, navigate to your repository
2. Click on "Settings" in the top right
3. Select "Secrets" from the left sidebar
4. Click "Add Secret"
5. Fill in the following:
   - Name: `SCW_SECRET_KEY`
   - Value: Your Scaleway API Secret Key
6. Click "Add Secret" to save

## Finding Your Scaleway Secret Key

To get your Scaleway Secret Key:

1. Log in to the [Scaleway Console](https://console.scaleway.com)
2. Click on your name/profile in the top right
3. Select "Credentials"
4. In the API Keys section, you can view your existing API keys or generate a new one
5. Use the Secret Key value (not the Access Key) for the `SCW_SECRET_KEY` secret

## Verifying Your Setup

After setting up the secret, you can verify it works by:

1. Manually triggering the workflow in the Gitea Actions tab
2. Checking that the workflow completes successfully
3. Verifying that your images appear in the Scaleway Container Registry

## Security Notes

- Always keep your Scaleway Secret Key secure and never share it
- Consider using a dedicated API key with limited permissions for CI/CD operations
- Rotate your API keys periodically for enhanced security