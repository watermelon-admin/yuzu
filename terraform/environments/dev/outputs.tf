# ============================================================================
# Terraform Outputs - Yuzu Dev Environment
# ============================================================================
# These outputs provide important information after deployment
# ============================================================================

# Resource Group
output "resource_group_name" {
  description = "Name of the resource group"
  value       = azurerm_resource_group.yuzu.name
}

output "resource_group_location" {
  description = "Location of the resource group"
  value       = azurerm_resource_group.yuzu.location
}

# Storage Account
output "storage_account_name" {
  description = "Name of the storage account"
  value       = azurerm_storage_account.yuzu.name
}

output "storage_account_uri" {
  description = "URI of the Azure Table Storage account"
  value       = "https://${azurerm_storage_account.yuzu.name}.table.core.windows.net/"
}

output "storage_tables" {
  description = "List of Azure Tables created"
  value = [
    azurerm_storage_table.breaks.name,
    azurerm_storage_table.break_types.name,
    azurerm_storage_table.user_data.name,
    azurerm_storage_table.background_images.name
  ]
}

# App Service Plan
output "app_service_plan_name" {
  description = "Name of the App Service Plan"
  value       = azurerm_service_plan.yuzu.name
}

output "app_service_plan_sku" {
  description = "SKU of the App Service Plan"
  value       = azurerm_service_plan.yuzu.sku_name
}

# App Service (Web App)
output "app_service_name" {
  description = "Name of the App Service"
  value       = azurerm_windows_web_app.yuzu.name
}

output "app_service_url" {
  description = "URL of the deployed App Service"
  value       = "https://${azurerm_windows_web_app.yuzu.default_hostname}"
}

output "app_service_principal_id" {
  description = "Principal ID of the App Service Managed Identity"
  value       = azurerm_windows_web_app.yuzu.identity[0].principal_id
}

output "app_service_tenant_id" {
  description = "Tenant ID of the App Service Managed Identity"
  value       = azurerm_windows_web_app.yuzu.identity[0].tenant_id
}

# Key Vault
output "key_vault_name" {
  description = "Name of the Key Vault"
  value       = azurerm_key_vault.yuzu.name
}

output "key_vault_uri" {
  description = "URI of the Key Vault"
  value       = azurerm_key_vault.yuzu.vault_uri
}

# Deployment Instructions
output "next_steps" {
  description = "Next steps after deployment"
  value = <<-EOT
    ========================================
    YUZU DEV ENVIRONMENT DEPLOYED
    ========================================

    App Service URL: https://${azurerm_windows_web_app.yuzu.default_hostname}
    Key Vault:       ${azurerm_key_vault.yuzu.name}
    Storage Account: ${azurerm_storage_account.yuzu.name}

    NEXT STEPS:

    1. Update Key Vault secrets with actual values:

       Windows (PowerShell):
         cd terraform/environments/dev
         .\set-secrets.ps1

       Linux/Mac (Bash):
         cd terraform/environments/dev
         chmod +x set-secrets.sh
         ./set-secrets.sh

    2. Deploy your application code:

       az webapp deployment source config-zip \
         --resource-group ${azurerm_resource_group.yuzu.name} \
         --name ${azurerm_windows_web_app.yuzu.name} \
         --src path/to/your/app.zip

    3. Verify deployment:

       Open: https://${azurerm_windows_web_app.yuzu.default_hostname}

    ========================================
    EOT
}
