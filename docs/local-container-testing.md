# Testing Yuzu Containers Locally with Managed PostgreSQL

This guide explains how to test your Yuzu container locally while connecting to a managed PostgreSQL instance from Scaleway.

## Prerequisites

- Docker installed on your local machine
- Access to a Scaleway PostgreSQL Database Instance
- S3 storage bucket (can be Scaleway Object Storage)
- Docker image for Yuzu built using the provided Dockerfile

## Setting Up Managed PostgreSQL on Scaleway

If you haven't already created a managed PostgreSQL instance on Scaleway:

1. Log in to your Scaleway console (https://console.scaleway.com)
2. Navigate to Databases > PostgreSQL
3. Click "Create a PostgreSQL database"
4. Choose your plan and configuration
5. Create an initial user and database named "yuzu"
6. Note the connection details:
   - Endpoint (hostname)
   - Port (default: 5432)
   - Username and password
   - Database name

## Creating a Local Test Configuration

Create a modified version of appsettings.json for local testing with the managed database:

```bash
cat > local-test-settings.json << EOF
{
  "DataStorageConfig": {
    "StorageType": "PostgreSQL",
    "UseDevelopmentStorage": false,
    "ConnectionString": "Host=<YOUR_SCALEWAY_POSTGRES_ENDPOINT>;Database=yuzu;Username=<USERNAME>;Password=<PASSWORD>;SslMode=Require"
  },
  "S3Settings": {
    "ServiceUrl": "https://s3.fr-par.scw.cloud",
    "BucketName": "your-bucket-name",
    "BackgroundsContainer": "backgrounds",
    "AccessKey": "your-access-key",
    "SecretKey": "your-secret-key"
  },
  "MailConnectionConfig": {
    "smtpServer": "localhost",
    "ConfirmationHost": "breakscreen.com",
    "SenderName": "BreakScreen Team",
    "SenderEmail": "yuzu@dev.local",
    "smtpPassword": "Apollo13!",
    "smtpUsername": "yuzu",
    "NoReplySenderName": "BreakScreen Automailer",
    "NoReplySenderEmail": "yuzu@dev-local",
    "smtpNoReplyUsername": "yuzu@dev.local",
    "smtpNoReplyPassword": "Apollo13!",
    "smtpPort": 1025
  }
}
EOF
```

Replace the placeholders with your actual Scaleway PostgreSQL and S3 credentials.

## Ensuring Network Access to Your Database

For your local container to access the Scaleway managed PostgreSQL:

1. Go to your database settings in Scaleway console
2. Add your public IP address to the allowed IP addresses list
3. Alternatively, if available, enable public access with ACL protection

## Running the Container with Managed Database

Run your container with the configuration pointing to the managed database:

```bash
docker run -d --name yuzu-web-test \
  -p 8080:80 \
  -e ASPNETCORE_ENVIRONMENT=Production \
  -e DataStorageConfig__ConnectionString="Host=<YOUR_SCALEWAY_POSTGRES_ENDPOINT>;Database=yuzu;Username=<USERNAME>;Password=<PASSWORD>;SslMode=Require" \
  -e S3Settings__ServiceUrl="https://s3.fr-par.scw.cloud" \
  -e S3Settings__BucketName="your-bucket-name" \
  -e S3Settings__AccessKey="your-access-key" \
  -e S3Settings__SecretKey="your-secret-key" \
  yourusername/yuzu:latest
```

## Using a Local Configuration File

Instead of passing all settings as environment variables, you can mount a local configuration file:

1. Create the settings file:
   ```bash
   mkdir -p $(pwd)/config
   cp local-test-settings.json $(pwd)/config/appsettings.Production.json
   ```

2. Run the container with the mounted config:
   ```bash
   docker run -d --name yuzu-web-test \
     -p 8080:80 \
     -v $(pwd)/config:/app/config \
     -e ASPNETCORE_ENVIRONMENT=Production \
     -e DOTNET_ConfigurationPath=/app/config \
     yourusername/yuzu:latest
   ```

## Testing Email Functionality

For testing email functionality locally:

```bash
# Run MailHog container for email testing
docker run -d --name mailhog \
  -p 1025:1025 \
  -p 8025:8025 \
  mailhog/mailhog

# Run Yuzu container with MailHog settings
docker run -d --name yuzu-web-test \
  -p 8080:80 \
  --link mailhog \
  -e ASPNETCORE_ENVIRONMENT=Production \
  -e DataStorageConfig__ConnectionString="Host=<YOUR_SCALEWAY_POSTGRES_ENDPOINT>;Database=yuzu;Username=<USERNAME>;Password=<PASSWORD>;SslMode=Require" \
  -e S3Settings__ServiceUrl="https://s3.fr-par.scw.cloud" \
  -e S3Settings__BucketName="your-bucket-name" \
  -e S3Settings__AccessKey="your-access-key" \
  -e S3Settings__SecretKey="your-secret-key" \
  -e MailConnectionConfig__smtpServer="mailhog" \
  -e MailConnectionConfig__smtpPort="1025" \
  yourusername/yuzu:latest
```

You can access the MailHog web interface at http://localhost:8025 to see emails sent by the application.

## Hybrid Setup with Local S3 (MinIO)

If you want to use your Scaleway PostgreSQL but test with local S3 storage:

```bash
# Start MinIO container
docker run -d --name minio \
  -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio server /data --console-address ":9001"

# Create bucket for testing
docker exec minio mkdir -p /data/static/backgrounds

# Run Yuzu with managed PostgreSQL but local MinIO
docker run -d --name yuzu-web-test \
  -p 8080:80 \
  --link minio \
  -e ASPNETCORE_ENVIRONMENT=Production \
  -e DataStorageConfig__ConnectionString="Host=<YOUR_SCALEWAY_POSTGRES_ENDPOINT>;Database=yuzu;Username=<USERNAME>;Password=<PASSWORD>;SslMode=Require" \
  -e S3Settings__ServiceUrl="http://minio:9000" \
  -e S3Settings__BucketName="static" \
  -e S3Settings__AccessKey="minioadmin" \
  -e S3Settings__SecretKey="minioadmin" \
  yourusername/yuzu:latest
```

## Complete Local Testing Environment with Docker Compose

Create a `docker-compose.local-test.yml` file for a complete local testing environment:

```yaml
version: '3.8'

services:
  minio:
    image: minio/minio
    container_name: yuzu-minio
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio-data:/data
    command: server /data --console-address ":9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3

  mailhog:
    image: mailhog/mailhog
    container_name: mailhog
    ports:
      - "1025:1025"
      - "8025:8025"

  yuzu-web:
    image: yourusername/yuzu:latest
    container_name: yuzu-web
    depends_on:
      - minio
      - mailhog
    environment:
      - ASPNETCORE_ENVIRONMENT=Production
      - DataStorageConfig__ConnectionString=Host=<YOUR_SCALEWAY_POSTGRES_ENDPOINT>;Database=yuzu;Username=<USERNAME>;Password=<PASSWORD>;SslMode=Require
      - S3Settings__ServiceUrl=http://minio:9000
      - S3Settings__BucketName=static
      - S3Settings__BackgroundsContainer=backgrounds
      - S3Settings__AccessKey=minioadmin
      - S3Settings__SecretKey=minioadmin
      - MailConnectionConfig__smtpServer=mailhog
      - MailConnectionConfig__smtpUsername=yuzu
      - MailConnectionConfig__smtpPassword=Apollo13!
      - MailConnectionConfig__smtpPort=1025
    ports:
      - "8080:80"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:80/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  minio-data:
```

Run the environment:

```bash
docker-compose -f docker-compose.local-test.yml up -d
```

## Verifying Your Container Works

1. Check that the container is running:
   ```bash
   docker ps
   ```

2. Check the container logs:
   ```bash
   docker logs yuzu-web-test
   ```

3. Check that the application can connect to PostgreSQL:
   ```bash
   docker exec yuzu-web-test curl -f http://localhost:80/health
   ```

4. Access the application in your browser:
   ```
   http://localhost:8080
   ```

5. Test database connectivity more explicitly:
   ```bash
   docker exec -it yuzu-web-test /bin/bash
   apt-get update && apt-get install -y postgresql-client
   PGPASSWORD=<PASSWORD> psql -h <YOUR_SCALEWAY_POSTGRES_ENDPOINT> -U <USERNAME> -d yuzu -c "SELECT 1;"
   ```

## Troubleshooting

### Database Connection Issues

If the container can't connect to your Scaleway PostgreSQL:

1. Verify IP allowlisting in Scaleway console
2. Check that SSL mode is set correctly (likely `Require` or `VerifyFull`)
3. Make sure the database user has the right permissions
4. Try connecting with psql cli tool from your local machine to test connectivity

### S3 Storage Issues

If you have issues with S3 storage:

1. Verify your S3 credentials
2. Ensure the bucket exists
3. Verify CORS configuration if accessing the UI
4. Check that the BackgroundsContainer folder exists in your bucket

### Testing Database Migration

To verify that the application can properly migrate the database schema:

```bash
# Run the container with a clean database
docker run -d --name yuzu-migration-test \
  -p 8081:80 \
  -e ASPNETCORE_ENVIRONMENT=Production \
  -e DataStorageConfig__ConnectionString="Host=<YOUR_SCALEWAY_POSTGRES_ENDPOINT>;Database=yuzu_test;Username=<USERNAME>;Password=<PASSWORD>;SslMode=Require" \
  yourusername/yuzu:latest
```

### Testing with Different Kubernetes-Like Settings

To verify the container works with Kubernetes-style environment variables:

```bash
docker run -d --name yuzu-k8s-test \
  -p 8082:80 \
  -e ASPNETCORE_ENVIRONMENT=Production \
  -e KUBERNETES_SERVICE_HOST=dummy \
  -e DataStorageConfig__ConnectionString="Host=<YOUR_SCALEWAY_POSTGRES_ENDPOINT>;Database=yuzu;Username=<USERNAME>;Password=<PASSWORD>;SslMode=Require" \
  -e S3Settings__ServiceUrl="https://s3.fr-par.scw.cloud" \
  -e S3Settings__BucketName="your-bucket-name" \
  yourusername/yuzu:latest
```

## Preparing for Kubernetes Deployment

After verifying the container works locally:

1. Push the container to your container registry:
   ```bash
   docker tag yourusername/yuzu:latest rg.fr-par.scw.cloud/your-namespace/yuzu:latest
   docker push rg.fr-par.scw.cloud/your-namespace/yuzu:latest
   ```

2. Update your Kubernetes deployment to use this image

3. Apply your updated Kubernetes configuration to your Scaleway Kapsule cluster