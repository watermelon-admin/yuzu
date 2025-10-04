# ============================================================================
# Terraform Variables - Yuzu Dev Environment
# ============================================================================
# This file contains the actual values for the dev environment.
# Copy this file and modify for other environments (staging, prod).
# ============================================================================

# Environment Configuration
environment     = "dev"
location        = "germanywestcentral"
location_suffix = "dewc"
app_name        = "yuzu"

# Resource Names (following Azure naming conventions)
resource_group_name    = "rg-yuzu-dev-dewc-01"
storage_account_name   = "styuzudevdewc01"      # Must be globally unique, lowercase, no hyphens
app_service_plan_name  = "plan-yuzu-dev-dewc-01"
app_service_name       = "app-yuzu-dev-dewc-01" # Must be globally unique
key_vault_name         = "kv-yuzu-dev-dewc-01"  # Must be globally unique

# SKU Configuration
app_service_plan_sku        = "F1"       # Free tier for dev
storage_account_tier        = "Standard"
storage_account_replication = "LRS"      # Locally Redundant Storage

# .NET Configuration
dotnet_version = "v9.0"

# S3/Cloudflare R2 Settings (non-secret values)
s3_provider                = "CloudflareR2"
s3_service_url             = "https://your-account-id.r2.cloudflarestorage.com"
s3_bucket_name             = "yuzu-dev-bucket"
s3_backgrounds_container   = "backgrounds"
s3_widget_images_container = "widget-images"
s3_public_url              = "https://dev-backgrounds.breakscreen.com"

# Mail Settings (non-secret values)
smtp_server         = "smtp.sendgrid.net"
smtp_port           = "587"
mail_sender_name    = "Yuzu Dev"
mail_sender_email   = "dev@yuzu.app"
mail_noreply_name   = "Yuzu No-Reply"
mail_noreply_email  = "noreply@yuzu.app"

# Debug Settings
beta_enabled                   = "false"
treat_all_users_as_subscribed  = "false"
show_designer_debug_info       = "false"

# Tags
tags = {
  Environment = "dev"
  Project     = "Yuzu"
  ManagedBy   = "Terraform"
}
