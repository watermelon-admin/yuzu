# Yuzu Dev Environment - Azure Infrastructure

This Terraform configuration deploys the Yuzu application infrastructure to Azure Germany West Central region for the development environment.

## Infrastructure Overview

The following Azure resources are created:

- **Resource Group**: `rg-yuzu-dev-dewc-01`
- **Storage Account**: `styuzudevdewc01` (Azure Table Storage)
  - Tables: Breaks, BreakTypes, UserData, BackgroundImages
- **App Service Plan**: `plan-yuzu-dev-dewc-01` (F1 Free tier, Windows)
- **App Service**: `app-yuzu-dev-dewc-01` (.NET 9, System-assigned Managed Identity)
- **Key Vault**: `kv-yuzu-dev-dewc-01` (for secrets management)

### Authentication & Security

- **Azure Tables**: Uses Managed Identity (passwordless authentication via RBAC)
- **Key Vault**: App Service uses Managed Identity to read secrets
- **Secrets**: All sensitive values stored in Key Vault, referenced in App Settings
- **RBAC Roles**:
  - App Service → Storage Table Data Contributor
  - App Service → Key Vault Secrets User
  - Terraform principal → Key Vault Administrator

## Prerequisites

### Required Software

1. **Terraform** >= 1.5.0
   - Download: https://www.terraform.io/downloads

2. **Azure CLI**
   - Download: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli

3. **Azure Subscription**
   - Active Azure subscription with Contributor access

### Authentication

Login to Azure CLI before running Terraform:

```bash
az login
az account set --subscription "Your-Subscription-Name-or-ID"
```

Verify you're authenticated:

```bash
az account show
```

## Quick Start

```bash
# 1. Navigate to dev environment directory
cd terraform/environments/dev

# 2. Initialize Terraform
terraform init

# 3. Review planned changes
terraform plan

# 4. Deploy infrastructure
terraform apply

# 5. Set secrets (Windows)
.\set-secrets.ps1

# OR Set secrets (Linux/Mac)
chmod +x set-secrets.sh
./set-secrets.sh

# 6. Deploy your application code
# (See "Deploy Application Code" section below)
```

## Detailed Deployment Steps

### 1. Initialize Terraform

Initialize the Terraform working directory and download the Azure provider:

```bash
cd terraform/environments/dev
terraform init
```

This will create a `.terraform` directory and download required providers.

### 2. Review Configuration

**Important**: Before deploying, verify the following in `terraform.tfvars`:

- Resource names are globally unique (especially storage account and app service)
- S3/R2 settings match your Cloudflare R2 configuration
- SMTP settings match your email provider

### 3. Plan Deployment

Preview the resources that will be created:

```bash
terraform plan
```

Review the output to ensure it matches your expectations. This will show:
- 15+ resources to be created
- No destructive changes (for initial deployment)

### 4. Deploy Infrastructure

Apply the Terraform configuration:

```bash
terraform apply
```

Type `yes` when prompted to confirm the deployment.

**Deployment time**: ~3-5 minutes

### 5. Set Secrets

After infrastructure is deployed, set the actual secret values in Key Vault.

**Windows (PowerShell)**:
```powershell
.\set-secrets.ps1
```

**Linux/Mac (Bash)**:
```bash
chmod +x set-secrets.sh
./set-secrets.sh
```

The script will prompt you for the following secrets:

- **S3 Settings**: Access Key, Secret Key, Account ID
- **Mail Settings**: SMTP Username/Password, No-Reply credentials
- **Payment**: Stripe Secret Key
- **App Insights**: Connection String (optional)

Press Enter to skip a secret and keep the placeholder value.

### 6. Deploy Application Code

#### Option A: ZIP Deployment

```bash
# Build and publish your application
cd /path/to/Yuzu.Web
dotnet publish -c Release -o ./publish

# Create deployment package
cd publish
zip -r ../app.zip *

# Deploy to Azure
az webapp deployment source config-zip \
  --resource-group rg-yuzu-dev-dewc-01 \
  --name app-yuzu-dev-dewc-01 \
  --src ../app.zip
```

#### Option B: CI/CD with GitHub Actions

See `.github/workflows/` for automated deployment pipelines.

### 7. Verify Deployment

```bash
# Get the App Service URL
terraform output app_service_url

# Open in browser
# https://app-yuzu-dev-dewc-01.azurewebsites.net
```

## Configuration

### terraform.tfvars

The `terraform.tfvars` file contains all configurable values for the dev environment:

```hcl
# Resource Names
resource_group_name    = "rg-yuzu-dev-dewc-01"
storage_account_name   = "styuzudevdewc01"
app_service_name       = "app-yuzu-dev-dewc-01"
key_vault_name         = "kv-yuzu-dev-dewc-01"

# SKU Configuration
app_service_plan_sku = "F1"  # Free tier

# Application Settings
s3_service_url   = "https://your-account-id.r2.cloudflarestorage.com"
smtp_server      = "smtp.sendgrid.net"
beta_enabled     = "false"
# ... more settings
```

### Secrets Management

Secrets are stored in Azure Key Vault and referenced in App Service application settings:

```hcl
# In App Service configuration
"S3Settings__AccessKey" = "@Microsoft.KeyVault(SecretUri=...)"
```

This provides:
- ✅ Centralized secret management
- ✅ Automatic secret rotation support
- ✅ No secrets in code or config files
- ✅ RBAC-controlled access

## Outputs

After deployment, Terraform provides useful outputs:

```bash
# View all outputs
terraform output

# View specific output
terraform output app_service_url
```

Available outputs:
- `app_service_url` - URL of the deployed application
- `key_vault_name` - Name of the Key Vault
- `storage_account_name` - Name of the storage account
- `app_service_principal_id` - Managed Identity principal ID
- `next_steps` - Formatted instructions for next steps

## Common Operations

### Update Application Settings

Modify `terraform.tfvars` or `main.tf`, then:

```bash
terraform plan
terraform apply
```

### Update Secrets

Run the set-secrets script again:

```bash
.\set-secrets.ps1  # Windows
./set-secrets.sh   # Linux/Mac
```

Or update individual secrets via Azure CLI:

```bash
az keyvault secret set \
  --vault-name kv-yuzu-dev-dewc-01 \
  --name "S3Settings-AccessKey" \
  --value "your-new-value"
```

### Restart App Service

After changing settings or secrets:

```bash
az webapp restart \
  --resource-group rg-yuzu-dev-dewc-01 \
  --name app-yuzu-dev-dewc-01
```

### View App Service Logs

```bash
az webapp log tail \
  --resource-group rg-yuzu-dev-dewc-01 \
  --name app-yuzu-dev-dewc-01
```

## Troubleshooting

### "Key Vault already exists" error

If you previously deleted the Key Vault, it may be soft-deleted. Either:

**Option A**: Recover the soft-deleted Key Vault
```bash
az keyvault recover --name kv-yuzu-dev-dewc-01
```

**Option B**: Purge the soft-deleted Key Vault (dev environment only!)
```bash
az keyvault purge --name kv-yuzu-dev-dewc-01
```

Then run `terraform apply` again.

### "Storage account name already taken"

Storage account names must be globally unique. Update `storage_account_name` in `terraform.tfvars`:

```hcl
storage_account_name = "styuzudevdewc02"  # Increment the number
```

### App Service can't access Key Vault

Check that the Managed Identity has the correct role:

```bash
# List role assignments
az role assignment list \
  --scope /subscriptions/{subscription-id}/resourceGroups/rg-yuzu-dev-dewc-01/providers/Microsoft.KeyVault/vaults/kv-yuzu-dev-dewc-01
```

### Terraform State Lock

If Terraform is interrupted, you may see a state lock error:

```bash
terraform force-unlock <lock-id>
```

## Clean Up

### Destroy All Resources

**WARNING**: This will delete all resources and data!

```bash
terraform destroy
```

Type `yes` to confirm.

### Destroy Specific Resources

```bash
# Remove specific resource
terraform destroy -target=azurerm_windows_web_app.yuzu
```

## File Structure

```
terraform/environments/dev/
├── main.tf              # Main resource definitions
├── providers.tf         # Provider configuration
├── variables.tf         # Variable declarations
├── terraform.tfvars     # Variable values (dev environment)
├── outputs.tf           # Output definitions
├── set-secrets.ps1      # PowerShell script to set secrets
├── set-secrets.sh       # Bash script to set secrets
├── README.md            # This file
└── .gitignore           # Terraform ignore rules
```

## Environment Expansion

To create additional environments (staging, prod):

1. Copy the `dev` directory:
   ```bash
   cp -r terraform/environments/dev terraform/environments/staging
   ```

2. Update `terraform.tfvars`:
   - Change environment from "dev" to "staging"
   - Update resource names (e.g., `rg-yuzu-staging-dewc-01`)
   - Adjust SKU tiers (e.g., `B1` or `S1` for staging/prod)
   - Update tags

3. Update `set-secrets.ps1` and `set-secrets.sh`:
   - Change Key Vault name to staging/prod vault

4. Deploy:
   ```bash
   cd terraform/environments/staging
   terraform init
   terraform apply
   ```

## Best Practices

### For Development

- ✅ Use F1 (Free) tier for App Service Plan
- ✅ Use LRS (Locally Redundant Storage) for Storage Account
- ✅ Enable purge protection: **DISABLED** (allows easy recreation)
- ✅ Enable public network access (for easy testing)
- ✅ Use placeholder secrets initially
- ✅ Tag resources with `Environment = "dev"`

### For Production

- ✅ Use S1 or higher tier for App Service Plan
- ✅ Use ZRS (Zone Redundant Storage) for Storage Account
- ✅ Enable purge protection: **ENABLED** (prevents accidental deletion)
- ✅ Restrict network access with Private Endpoints
- ✅ Use production secrets in Key Vault
- ✅ Enable Application Insights for monitoring
- ✅ Configure auto-scaling
- ✅ Set up alerts and monitoring
- ✅ Use remote backend for Terraform state (Azure Storage)

## Support

For issues or questions:

1. Check Azure Portal for resource status and logs
2. Review Terraform plan output before applying
3. Check App Service logs: `az webapp log tail`
4. Verify RBAC role assignments
5. Ensure secrets are set correctly in Key Vault

## References

- [Azure Naming Conventions](https://docs.microsoft.com/en-us/azure/cloud-adoption-framework/ready/azure-best-practices/naming-and-tagging)
- [Terraform Azure Provider](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)
- [Azure App Service Documentation](https://docs.microsoft.com/en-us/azure/app-service/)
- [Azure Key Vault Documentation](https://docs.microsoft.com/en-us/azure/key-vault/)
