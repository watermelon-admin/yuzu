# ============================================================================
# Yuzu Dev Environment - Azure Infrastructure
# ============================================================================
# This Terraform configuration creates the Azure infrastructure for the
# Yuzu application dev environment in Germany West Central region.
# ============================================================================

# Get current Azure client configuration
data "azurerm_client_config" "current" {}

# ============================================================================
# RESOURCE GROUP
# ============================================================================

resource "azurerm_resource_group" "yuzu" {
  name     = var.resource_group_name
  location = var.location
  tags     = var.tags
}

# ============================================================================
# STORAGE ACCOUNT (Azure Table Storage)
# ============================================================================

resource "azurerm_storage_account" "yuzu" {
  name                     = var.storage_account_name
  resource_group_name      = azurerm_resource_group.yuzu.name
  location                 = azurerm_resource_group.yuzu.location
  account_tier             = var.storage_account_tier
  account_replication_type = var.storage_account_replication
  account_kind             = "StorageV2"

  # Enable public network access for dev
  public_network_access_enabled = true

  # Minimum TLS version
  min_tls_version = "TLS1_2"

  tags = var.tags
}

# Create Azure Tables
resource "azurerm_storage_table" "breaks" {
  name                 = "Breaks"
  storage_account_name = azurerm_storage_account.yuzu.name
}

resource "azurerm_storage_table" "break_types" {
  name                 = "BreakTypes"
  storage_account_name = azurerm_storage_account.yuzu.name
}

resource "azurerm_storage_table" "user_data" {
  name                 = "UserData"
  storage_account_name = azurerm_storage_account.yuzu.name
}

resource "azurerm_storage_table" "background_images" {
  name                 = "BackgroundImages"
  storage_account_name = azurerm_storage_account.yuzu.name
}

# ============================================================================
# APP SERVICE PLAN
# ============================================================================

resource "azurerm_service_plan" "yuzu" {
  name                = var.app_service_plan_name
  resource_group_name = azurerm_resource_group.yuzu.name
  location            = azurerm_resource_group.yuzu.location
  os_type             = "Windows"
  sku_name            = var.app_service_plan_sku

  tags = var.tags
}

# ============================================================================
# APP SERVICE (WEB APP)
# ============================================================================

resource "azurerm_windows_web_app" "yuzu" {
  name                = var.app_service_name
  resource_group_name = azurerm_resource_group.yuzu.name
  location            = azurerm_resource_group.yuzu.location
  service_plan_id     = azurerm_service_plan.yuzu.id

  # Enable system-assigned managed identity
  identity {
    type = "SystemAssigned"
  }

  # Site configuration
  site_config {
    always_on        = false # Free tier doesn't support always on
    http2_enabled    = true
    ftps_state       = "FtpsOnly"
    minimum_tls_version = "1.2"

    # .NET 9 configuration
    application_stack {
      current_stack  = "dotnet"
      dotnet_version = var.dotnet_version
    }
  }

  # HTTPS only
  https_only = true

  # Application settings (configured separately below)
  app_settings = local.app_settings

  tags = var.tags

  # Prevent recreation when Key Vault secrets are updated
  lifecycle {
    ignore_changes = [
      app_settings["S3Settings__AccessKey"],
      app_settings["S3Settings__SecretKey"],
      app_settings["S3Settings__AccountId"],
      app_settings["MailSettings__SmtpUsername"],
      app_settings["MailSettings__SmtpPassword"],
      app_settings["MailSettings__SmtpNoReplyUsername"],
      app_settings["MailSettings__SmtpNoReplyPassword"],
      app_settings["PaymentConfig__Stripe__SecretKey"],
      app_settings["ApplicationInsights__ConnectionString"]
    ]
  }
}

# ============================================================================
# KEY VAULT
# ============================================================================

resource "azurerm_key_vault" "yuzu" {
  name                = var.key_vault_name
  resource_group_name = azurerm_resource_group.yuzu.name
  location            = azurerm_resource_group.yuzu.location
  tenant_id           = data.azurerm_client_config.current.tenant_id
  sku_name            = "standard"

  # IMPORTANT: Purge protection DISABLED for dev environment
  # This allows easy deletion and recreation during development
  purge_protection_enabled = false

  # Soft delete with minimum retention (7 days)
  soft_delete_retention_days = 7

  # Enable RBAC authorization (not access policies)
  enable_rbac_authorization = true

  # Enable public network access for dev
  public_network_access_enabled = true

  tags = var.tags
}

# ============================================================================
# KEY VAULT SECRETS (with placeholder values)
# ============================================================================

# Azure Tables Connection String (not used, we use Managed Identity)
resource "azurerm_key_vault_secret" "azure_tables_connection" {
  name         = "AzureTables-ConnectionString"
  value        = "PLACEHOLDER_WILL_USE_MANAGED_IDENTITY"
  key_vault_id = azurerm_key_vault.yuzu.id

  depends_on = [
    azurerm_role_assignment.keyvault_admin
  ]
}

# Cloudflare R2 Secrets
resource "azurerm_key_vault_secret" "s3_access_key" {
  name         = "S3Settings-AccessKey"
  value        = "PLACEHOLDER_YOUR_R2_ACCESS_KEY"
  key_vault_id = azurerm_key_vault.yuzu.id

  depends_on = [
    azurerm_role_assignment.keyvault_admin
  ]
}

resource "azurerm_key_vault_secret" "s3_secret_key" {
  name         = "S3Settings-SecretKey"
  value        = "PLACEHOLDER_YOUR_R2_SECRET_KEY"
  key_vault_id = azurerm_key_vault.yuzu.id

  depends_on = [
    azurerm_role_assignment.keyvault_admin
  ]
}

resource "azurerm_key_vault_secret" "s3_account_id" {
  name         = "S3Settings-AccountId"
  value        = "PLACEHOLDER_YOUR_R2_ACCOUNT_ID"
  key_vault_id = azurerm_key_vault.yuzu.id

  depends_on = [
    azurerm_role_assignment.keyvault_admin
  ]
}

# Mail Settings Secrets
resource "azurerm_key_vault_secret" "smtp_username" {
  name         = "MailSettings-SmtpUsername"
  value        = "PLACEHOLDER_SMTP_USERNAME"
  key_vault_id = azurerm_key_vault.yuzu.id

  depends_on = [
    azurerm_role_assignment.keyvault_admin
  ]
}

resource "azurerm_key_vault_secret" "smtp_password" {
  name         = "MailSettings-SmtpPassword"
  value        = "PLACEHOLDER_SMTP_PASSWORD"
  key_vault_id = azurerm_key_vault.yuzu.id

  depends_on = [
    azurerm_role_assignment.keyvault_admin
  ]
}

resource "azurerm_key_vault_secret" "smtp_noreply_username" {
  name         = "MailSettings-SmtpNoReplyUsername"
  value        = "PLACEHOLDER_NOREPLY_USERNAME"
  key_vault_id = azurerm_key_vault.yuzu.id

  depends_on = [
    azurerm_role_assignment.keyvault_admin
  ]
}

resource "azurerm_key_vault_secret" "smtp_noreply_password" {
  name         = "MailSettings-SmtpNoReplyPassword"
  value        = "PLACEHOLDER_NOREPLY_PASSWORD"
  key_vault_id = azurerm_key_vault.yuzu.id

  depends_on = [
    azurerm_role_assignment.keyvault_admin
  ]
}

# Payment Configuration Secrets
resource "azurerm_key_vault_secret" "stripe_secret_key" {
  name         = "PaymentConfig-Stripe-SecretKey"
  value        = "PLACEHOLDER_STRIPE_SECRET_KEY"
  key_vault_id = azurerm_key_vault.yuzu.id

  depends_on = [
    azurerm_role_assignment.keyvault_admin
  ]
}

# Application Insights Connection String
resource "azurerm_key_vault_secret" "app_insights_connection" {
  name         = "ApplicationInsights-ConnectionString"
  value        = "PLACEHOLDER_APP_INSIGHTS_CONN"
  key_vault_id = azurerm_key_vault.yuzu.id

  depends_on = [
    azurerm_role_assignment.keyvault_admin
  ]
}

# ============================================================================
# RBAC ROLE ASSIGNMENTS
# ============================================================================

# Grant Terraform service principal Key Vault Administrator role
# This is needed to create secrets during terraform apply
resource "azurerm_role_assignment" "keyvault_admin" {
  scope                = azurerm_key_vault.yuzu.id
  role_definition_name = "Key Vault Administrator"
  principal_id         = data.azurerm_client_config.current.object_id
}

# Grant App Service Managed Identity access to Key Vault secrets
resource "azurerm_role_assignment" "app_keyvault_secrets" {
  scope                = azurerm_key_vault.yuzu.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_windows_web_app.yuzu.identity[0].principal_id
}

# Grant App Service Managed Identity access to Azure Table Storage
resource "azurerm_role_assignment" "app_storage_tables" {
  scope                = azurerm_storage_account.yuzu.id
  role_definition_name = "Storage Table Data Contributor"
  principal_id         = azurerm_windows_web_app.yuzu.identity[0].principal_id
}

# ============================================================================
# APPLICATION SETTINGS
# ============================================================================

locals {
  # App Service application settings
  # Uses Key Vault references for secrets
  app_settings = {
    # Azure Tables Settings - Use Managed Identity
    "AzureTablesSettings__UseManagedIdentity" = "true"
    "AzureTablesSettings__AccountUri"         = "https://${azurerm_storage_account.yuzu.name}.table.core.windows.net/"

    # Cloudflare R2 Settings (non-secrets)
    "S3Settings__Provider"              = var.s3_provider
    "S3Settings__ServiceUrl"            = var.s3_service_url
    "S3Settings__BucketName"            = var.s3_bucket_name
    "S3Settings__BackgroundsContainer"  = var.s3_backgrounds_container
    "S3Settings__WidgetImagesContainer" = var.s3_widget_images_container
    "S3Settings__PublicUrl"             = var.s3_public_url
    "S3Settings__ForcePathStyle"        = "true"
    "S3Settings__DisablePayloadSigning" = "true"

    # Cloudflare R2 Secrets (Key Vault references)
    "S3Settings__AccessKey" = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.s3_access_key.id})"
    "S3Settings__SecretKey" = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.s3_secret_key.id})"
    "S3Settings__AccountId" = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.s3_account_id.id})"

    # Mail Settings (non-secrets)
    "MailSettings__SmtpServer"         = var.smtp_server
    "MailSettings__SmtpPort"           = var.smtp_port
    "MailSettings__ConfirmationHost"   = "${var.app_service_name}.azurewebsites.net"
    "MailSettings__SenderName"         = var.mail_sender_name
    "MailSettings__SenderEmail"        = var.mail_sender_email
    "MailSettings__NoReplySenderName"  = var.mail_noreply_name
    "MailSettings__NoReplySenderEmail" = var.mail_noreply_email

    # Mail Settings Secrets (Key Vault references)
    "MailSettings__SmtpUsername"         = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.smtp_username.id})"
    "MailSettings__SmtpPassword"         = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.smtp_password.id})"
    "MailSettings__SmtpNoReplyUsername"  = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.smtp_noreply_username.id})"
    "MailSettings__SmtpNoReplyPassword"  = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.smtp_noreply_password.id})"

    # Payment Configuration (Key Vault reference)
    "PaymentConfig__Stripe__SecretKey" = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.stripe_secret_key.id})"

    # Application Insights (Key Vault reference)
    "ApplicationInsights__ConnectionString" = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.app_insights_connection.id})"

    # Beta Settings
    "BetaSettings__Enabled" = var.beta_enabled

    # Debug Settings
    "DebugSettings__TreatAllUsersAsSubscribed" = var.treat_all_users_as_subscribed
    "DebugSettings__ShowDesignerDebugInfo"     = var.show_designer_debug_info

    # ASP.NET Core Settings
    "ASPNETCORE_ENVIRONMENT" = "Development"
    "WEBSITE_RUN_FROM_PACKAGE" = "1"
  }
}
