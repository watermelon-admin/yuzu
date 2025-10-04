#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Sets Azure Key Vault secrets for Yuzu dev environment

.DESCRIPTION
    This script prompts for all required secret values and updates
    the Azure Key Vault with the actual values. Run this after
    terraform apply to configure the secrets.

.EXAMPLE
    .\set-secrets.ps1

.NOTES
    Requires Azure CLI to be installed and authenticated.
    Run 'az login' before executing this script.
#>

param(
    [Parameter(Mandatory=$false)]
    [string]$KeyVaultName = "kv-yuzu-dev-dewc-01"
)

# Color output functions
function Write-Success { param($Message) Write-Host $Message -ForegroundColor Green }
function Write-Info { param($Message) Write-Host $Message -ForegroundColor Cyan }
function Write-Warning { param($Message) Write-Host $Message -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host $Message -ForegroundColor Red }

# Banner
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  YUZU - Set Key Vault Secrets (Dev)" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check if Azure CLI is installed
try {
    $null = Get-Command az -ErrorAction Stop
} catch {
    Write-Error "ERROR: Azure CLI is not installed or not in PATH"
    Write-Info "Download from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
}

# Check if logged in to Azure
Write-Info "Checking Azure authentication..."
$account = az account show 2>$null | ConvertFrom-Json
if (-not $account) {
    Write-Error "ERROR: Not logged in to Azure"
    Write-Info "Run 'az login' to authenticate"
    exit 1
}

Write-Success "✓ Authenticated as: $($account.user.name)"
Write-Info "  Subscription: $($account.name) ($($account.id))"
Write-Host ""

# Check if Key Vault exists
Write-Info "Checking if Key Vault exists: $KeyVaultName"
$kvExists = az keyvault show --name $KeyVaultName 2>$null
if (-not $kvExists) {
    Write-Error "ERROR: Key Vault '$KeyVaultName' not found"
    Write-Info "Run 'terraform apply' first to create the infrastructure"
    exit 1
}

Write-Success "✓ Key Vault found: $KeyVaultName"
Write-Host ""

# Prompt for secrets
Write-Host "============================================" -ForegroundColor Yellow
Write-Host "  Enter Secret Values" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Yellow
Write-Host ""
Write-Warning "Press Enter to skip a secret (keep placeholder value)"
Write-Host ""

# S3/Cloudflare R2 Secrets
Write-Host "--- Cloudflare R2 / S3 Settings ---" -ForegroundColor Cyan
$s3AccessKey = Read-Host "S3 Access Key"
$s3SecretKey = Read-Host "S3 Secret Key" -AsSecureString
$s3AccountId = Read-Host "S3 Account ID (Cloudflare R2)"

# Mail Settings Secrets
Write-Host ""
Write-Host "--- Mail Settings (SMTP) ---" -ForegroundColor Cyan
$smtpUsername = Read-Host "SMTP Username"
$smtpPassword = Read-Host "SMTP Password" -AsSecureString
$smtpNoReplyUsername = Read-Host "SMTP No-Reply Username"
$smtpNoReplyPassword = Read-Host "SMTP No-Reply Password" -AsSecureString

# Payment Configuration Secrets
Write-Host ""
Write-Host "--- Payment Configuration ---" -ForegroundColor Cyan
$stripeSecretKey = Read-Host "Stripe Secret Key (sk_test_...)" -AsSecureString

# Application Insights (optional)
Write-Host ""
Write-Host "--- Application Insights (Optional) ---" -ForegroundColor Cyan
$appInsightsConnection = Read-Host "Application Insights Connection String"

Write-Host ""
Write-Host "============================================" -ForegroundColor Yellow
Write-Host "  Updating Key Vault Secrets" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Yellow
Write-Host ""

# Function to set secret if not empty
function Set-Secret {
    param(
        [string]$Name,
        [object]$Value
    )

    $plainValue = $Value
    if ($Value -is [System.Security.SecureString]) {
        $plainValue = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
            [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Value)
        )
    }

    if ([string]::IsNullOrWhiteSpace($plainValue)) {
        Write-Warning "⊘ Skipping: $Name"
        return
    }

    Write-Info "→ Setting: $Name"
    $result = az keyvault secret set --vault-name $KeyVaultName --name $Name --value $plainValue 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Success "  ✓ Success"
    } else {
        Write-Error "  ✗ Failed: $result"
    }
}

# Set S3 secrets
Set-Secret -Name "S3Settings-AccessKey" -Value $s3AccessKey
Set-Secret -Name "S3Settings-SecretKey" -Value $s3SecretKey
Set-Secret -Name "S3Settings-AccountId" -Value $s3AccountId

# Set Mail secrets
Set-Secret -Name "MailSettings-SmtpUsername" -Value $smtpUsername
Set-Secret -Name "MailSettings-SmtpPassword" -Value $smtpPassword
Set-Secret -Name "MailSettings-SmtpNoReplyUsername" -Value $smtpNoReplyUsername
Set-Secret -Name "MailSettings-SmtpNoReplyPassword" -Value $smtpNoReplyPassword

# Set Payment secrets
Set-Secret -Name "PaymentConfig-Stripe-SecretKey" -Value $stripeSecretKey

# Set Application Insights
Set-Secret -Name "ApplicationInsights-ConnectionString" -Value $appInsightsConnection

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Secrets Update Complete" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Info "Next steps:"
Write-Info "1. Deploy your application code to Azure App Service"
Write-Info "2. Restart the App Service to load the new secret values"
Write-Info "3. Verify the application is working correctly"
Write-Host ""
