#!/usr/bin/env bash
#
# Sets Azure Key Vault secrets for Yuzu dev environment
#
# This script prompts for all required secret values and updates
# the Azure Key Vault with the actual values. Run this after
# terraform apply to configure the secrets.
#
# Usage:
#   chmod +x set-secrets.sh
#   ./set-secrets.sh
#
# Requirements:
#   - Azure CLI installed and authenticated (az login)
#

set -euo pipefail

# Configuration
KEY_VAULT_NAME="${1:-kv-yuzu-dev-dewc-01}"

# Color output functions
color_reset='\033[0m'
color_red='\033[0;31m'
color_green='\033[0;32m'
color_yellow='\033[0;33m'
color_cyan='\033[0;36m'

print_success() { echo -e "${color_green}$1${color_reset}"; }
print_info() { echo -e "${color_cyan}$1${color_reset}"; }
print_warning() { echo -e "${color_yellow}$1${color_reset}"; }
print_error() { echo -e "${color_red}$1${color_reset}"; }

# Banner
echo ""
echo -e "${color_cyan}============================================${color_reset}"
echo -e "${color_cyan}  YUZU - Set Key Vault Secrets (Dev)${color_reset}"
echo -e "${color_cyan}============================================${color_reset}"
echo ""

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    print_error "ERROR: Azure CLI is not installed or not in PATH"
    print_info "Download from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Check if logged in to Azure
print_info "Checking Azure authentication..."
if ! account_info=$(az account show 2>/dev/null); then
    print_error "ERROR: Not logged in to Azure"
    print_info "Run 'az login' to authenticate"
    exit 1
fi

account_name=$(echo "$account_info" | jq -r '.user.name')
subscription_name=$(echo "$account_info" | jq -r '.name')
subscription_id=$(echo "$account_info" | jq -r '.id')

print_success "✓ Authenticated as: $account_name"
print_info "  Subscription: $subscription_name ($subscription_id)"
echo ""

# Check if Key Vault exists
print_info "Checking if Key Vault exists: $KEY_VAULT_NAME"
if ! az keyvault show --name "$KEY_VAULT_NAME" &> /dev/null; then
    print_error "ERROR: Key Vault '$KEY_VAULT_NAME' not found"
    print_info "Run 'terraform apply' first to create the infrastructure"
    exit 1
fi

print_success "✓ Key Vault found: $KEY_VAULT_NAME"
echo ""

# Prompt for secrets
echo -e "${color_yellow}============================================${color_reset}"
echo -e "${color_yellow}  Enter Secret Values${color_reset}"
echo -e "${color_yellow}============================================${color_reset}"
echo ""
print_warning "Press Enter to skip a secret (keep placeholder value)"
echo ""

# S3/Cloudflare R2 Secrets
echo -e "${color_cyan}--- Cloudflare R2 / S3 Settings ---${color_reset}"
read -p "S3 Access Key: " s3_access_key
read -sp "S3 Secret Key: " s3_secret_key
echo ""
read -p "S3 Account ID (Cloudflare R2): " s3_account_id

# Mail Settings Secrets
echo ""
echo -e "${color_cyan}--- Mail Settings (SMTP) ---${color_reset}"
read -p "SMTP Username: " smtp_username
read -sp "SMTP Password: " smtp_password
echo ""
read -p "SMTP No-Reply Username: " smtp_noreply_username
read -sp "SMTP No-Reply Password: " smtp_noreply_password
echo ""

# Payment Configuration Secrets
echo ""
echo -e "${color_cyan}--- Payment Configuration ---${color_reset}"
read -sp "Stripe Secret Key (sk_test_...): " stripe_secret_key
echo ""

# Application Insights (optional)
echo ""
echo -e "${color_cyan}--- Application Insights (Optional) ---${color_reset}"
read -p "Application Insights Connection String: " app_insights_connection

echo ""
echo -e "${color_yellow}============================================${color_reset}"
echo -e "${color_yellow}  Updating Key Vault Secrets${color_reset}"
echo -e "${color_yellow}============================================${color_reset}"
echo ""

# Function to set secret if not empty
set_secret() {
    local name="$1"
    local value="$2"

    if [[ -z "$value" ]]; then
        print_warning "⊘ Skipping: $name"
        return
    fi

    print_info "→ Setting: $name"
    if az keyvault secret set --vault-name "$KEY_VAULT_NAME" --name "$name" --value "$value" &> /dev/null; then
        print_success "  ✓ Success"
    else
        print_error "  ✗ Failed"
    fi
}

# Set S3 secrets
set_secret "S3Settings-AccessKey" "$s3_access_key"
set_secret "S3Settings-SecretKey" "$s3_secret_key"
set_secret "S3Settings-AccountId" "$s3_account_id"

# Set Mail secrets
set_secret "MailSettings-SmtpUsername" "$smtp_username"
set_secret "MailSettings-SmtpPassword" "$smtp_password"
set_secret "MailSettings-SmtpNoReplyUsername" "$smtp_noreply_username"
set_secret "MailSettings-SmtpNoReplyPassword" "$smtp_noreply_password"

# Set Payment secrets
set_secret "PaymentConfig-Stripe-SecretKey" "$stripe_secret_key"

# Set Application Insights
set_secret "ApplicationInsights-ConnectionString" "$app_insights_connection"

echo ""
echo -e "${color_green}============================================${color_reset}"
echo -e "${color_green}  Secrets Update Complete${color_reset}"
echo -e "${color_green}============================================${color_reset}"
echo ""
print_info "Next steps:"
print_info "1. Deploy your application code to Azure App Service"
print_info "2. Restart the App Service to load the new secret values"
print_info "3. Verify the application is working correctly"
echo ""
