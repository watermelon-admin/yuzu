terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 2.0"
    }
  }

  # Optional: Configure remote backend for state storage
  # Uncomment and configure when ready to use remote state
  # backend "azurerm" {
  #   resource_group_name  = "rg-yuzu-terraform-state-dewc-01"
  #   storage_account_name = "styuzutfstatedewc01"
  #   container_name       = "tfstate"
  #   key                  = "dev.terraform.tfstate"
  # }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy    = true  # Purge soft-deleted Key Vaults on destroy
      recover_soft_deleted_key_vaults = true  # Recover soft-deleted Key Vaults on create
    }
    resource_group {
      prevent_deletion_if_contains_resources = false
    }
  }

  # Optionally specify subscription_id, tenant_id here
  # or use environment variables:
  # ARM_SUBSCRIPTION_ID, ARM_TENANT_ID, ARM_CLIENT_ID, ARM_CLIENT_SECRET
}

provider "azuread" {
  # Uses same authentication as azurerm provider
}
