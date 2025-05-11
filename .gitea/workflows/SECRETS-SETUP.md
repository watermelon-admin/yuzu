# Setting Up Secrets for Gitea Workflows

This guide explains how to set up the required secrets for the Gitea CI/CD workflows in this repository.

## Required Secrets

For the Docker image build and push workflow, you need to set up:

- `SCW_SECRET_KEY`: Your Scaleway Secret Key for authenticating with the container registry

## Steps to Add Secrets in Gitea

1. **Navigate to the Repository Settings**
   - Go to your repository in Gitea
   - Click on "Settings" in the top-right menu
   - Select "Secrets" from the left sidebar

2. **Add the SCW_SECRET_KEY Secret**
   - Click "Add Secret"
   - Name: `SCW_SECRET_KEY`
   - Value: Your Scaleway Secret Key
   - Click "Add Secret" to save

## Finding Your Scaleway Secret Key

If you don't have your Scaleway Secret Key:

1. Log in to the [Scaleway Console](https://console.scaleway.com)
2. Navigate to your account settings
3. Go to Credentials section
4. Generate or find your API Secret Key

## Security Considerations

- Never share your Secret Key or commit it to the repository
- Consider using a dedicated service account with limited permissions for CI/CD
- Periodically rotate your secret keys for enhanced security

## Testing Secret Configuration

To verify your secret is correctly set up:

1. Make a small change to the repository
2. Push it to the main branch
3. Check the "Actions" tab to see if the workflow runs successfully
4. Confirm the image appears in your Scaleway Container Registry