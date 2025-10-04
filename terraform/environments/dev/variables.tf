variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "location" {
  description = "Azure region for resources"
  type        = string
  default     = "germanywestcentral"
}

variable "location_suffix" {
  description = "Location suffix for naming (e.g., dewc for Germany West Central)"
  type        = string
  default     = "dewc"
}

variable "app_name" {
  description = "Application name (yuzu)"
  type        = string
  default     = "yuzu"
}

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
  default     = "rg-yuzu-dev-dewc-01"
}

variable "storage_account_name" {
  description = "Name of the storage account (must be globally unique, lowercase, no hyphens)"
  type        = string
  default     = "styuzudevdewc01"
}

variable "app_service_plan_name" {
  description = "Name of the App Service Plan"
  type        = string
  default     = "plan-yuzu-dev-dewc-01"
}

variable "app_service_name" {
  description = "Name of the App Service (Web App)"
  type        = string
  default     = "app-yuzu-dev-dewc-01"
}

variable "key_vault_name" {
  description = "Name of the Key Vault"
  type        = string
  default     = "kv-yuzu-dev-dewc-01"
}

variable "app_service_plan_sku" {
  description = "SKU for App Service Plan"
  type        = string
  default     = "F1" # Free tier for dev
}

variable "storage_account_tier" {
  description = "Storage account tier"
  type        = string
  default     = "Standard"
}

variable "storage_account_replication" {
  description = "Storage account replication type"
  type        = string
  default     = "LRS" # Locally Redundant Storage
}

variable "dotnet_version" {
  description = ".NET version for App Service"
  type        = string
  default     = "v9.0"
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default = {
    Environment = "dev"
    Project     = "Yuzu"
    ManagedBy   = "Terraform"
  }
}

# Application Settings - Non-Secret Values
variable "s3_provider" {
  description = "S3 provider name"
  type        = string
  default     = "CloudflareR2"
}

variable "s3_service_url" {
  description = "S3/R2 service URL"
  type        = string
  default     = "https://your-account-id.r2.cloudflarestorage.com"
}

variable "s3_bucket_name" {
  description = "S3/R2 bucket name"
  type        = string
  default     = "yuzu-dev-bucket"
}

variable "s3_backgrounds_container" {
  description = "S3/R2 backgrounds container name"
  type        = string
  default     = "backgrounds"
}

variable "s3_widget_images_container" {
  description = "S3/R2 widget images container name"
  type        = string
  default     = "widget-images"
}

variable "s3_public_url" {
  description = "Public URL for S3/R2 content"
  type        = string
  default     = "https://dev-backgrounds.breakscreen.com"
}

variable "smtp_server" {
  description = "SMTP server hostname"
  type        = string
  default     = "smtp.sendgrid.net"
}

variable "smtp_port" {
  description = "SMTP server port"
  type        = string
  default     = "587"
}

variable "mail_sender_name" {
  description = "Email sender name"
  type        = string
  default     = "Yuzu Dev"
}

variable "mail_sender_email" {
  description = "Email sender address"
  type        = string
  default     = "dev@yuzu.app"
}

variable "mail_noreply_name" {
  description = "No-reply email sender name"
  type        = string
  default     = "Yuzu No-Reply"
}

variable "mail_noreply_email" {
  description = "No-reply email sender address"
  type        = string
  default     = "noreply@yuzu.app"
}

variable "beta_enabled" {
  description = "Enable beta features"
  type        = string
  default     = "false"
}

variable "treat_all_users_as_subscribed" {
  description = "Debug setting: treat all users as subscribed"
  type        = string
  default     = "false"
}

variable "show_designer_debug_info" {
  description = "Debug setting: show designer debug info"
  type        = string
  default     = "false"
}
