#!/bin/bash
# This script creates the necessary Kubernetes secrets for the Yuzu application

# Exit on any error
set -e

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo "kubectl is not installed. Please install it first."
    exit 1
fi

# Prompt for secret values
read -p "S3 Access Key: " S3_ACCESS_KEY
read -p "S3 Secret Key: " S3_SECRET_KEY
read -p "S3 Service URL: " S3_SERVICE_URL
read -p "S3 Bucket Name: " S3_BUCKET_NAME
read -p "PostgreSQL Host: " DB_HOST
read -p "PostgreSQL Username: " DB_USER
read -sp "PostgreSQL Password: " DB_PASSWORD
echo ""
read -p "SMTP Server: " SMTP_SERVER
read -p "SMTP Username: " SMTP_USERNAME
read -sp "SMTP Password: " SMTP_PASSWORD
echo ""
read -p "Stripe Secret Key: " STRIPE_SECRET_KEY
read -p "Stripe Publishable Key: " STRIPE_PUBLISHABLE_KEY

# Create connection string
CONNECTION_STRING="Host=${DB_HOST};Database=yuzu;Username=${DB_USER};Password=${DB_PASSWORD}"

# Create the Kubernetes secret
echo "Creating Kubernetes secret 'yuzu-app-secrets'..."
kubectl create secret generic yuzu-app-secrets \
  --from-literal=S3Settings__AccessKey="${S3_ACCESS_KEY}" \
  --from-literal=S3Settings__SecretKey="${S3_SECRET_KEY}" \
  --from-literal=S3Settings__ServiceUrl="${S3_SERVICE_URL}" \
  --from-literal=S3Settings__BucketName="${S3_BUCKET_NAME}" \
  --from-literal=DataStorageConfig__ConnectionString="${CONNECTION_STRING}" \
  --from-literal=PaymentConfig__Stripe__SecretKey="${STRIPE_SECRET_KEY}" \
  --from-literal=PaymentConfig__Stripe__PublishableKey="${STRIPE_PUBLISHABLE_KEY}" \
  --from-literal=MailConnectionConfig__smtpServer="${SMTP_SERVER}" \
  --from-literal=MailConnectionConfig__smtpUsername="${SMTP_USERNAME}" \
  --from-literal=MailConnectionConfig__smtpPassword="${SMTP_PASSWORD}" \
  --from-literal=POSTGRES_PASSWORD="${DB_PASSWORD}"

echo "Secret 'yuzu-app-secrets' created successfully!"
echo "You can now deploy the Yuzu application to your Kubernetes cluster."