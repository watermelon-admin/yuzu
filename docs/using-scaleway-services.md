# Running Yuzu Container with Existing Scaleway Services

This guide explains how to build and run your Yuzu container locally while connecting to existing Scaleway managed PostgreSQL and object storage services.

## Prerequisites

- Docker installed on your local machine
- Existing Scaleway PostgreSQL Database Instance
- Existing Scaleway Object Storage bucket
- Access keys for your Scaleway account

## Step 1: Build the Yuzu Container

First, build the Yuzu container using the Dockerfile:

```bash
# Navigate to the project root directory
cd /path/to/yuzu

# Build the container image
docker build -t yuzu:latest .
```

This will create a local Docker image named `yuzu:latest`.

## Step 2: Create an Environment File for Scaleway Services

Create a `.env` file with your Scaleway service credentials:

```bash
# Create an environment file
cat > scaleway-services.env << EOF
# Scaleway PostgreSQL settings
DataStorageConfig__ConnectionString=Host=<POSTGRES_ENDPOINT>;Database=yuzu;Username=<DB_USERNAME>;Password=<DB_PASSWORD>;SslMode=Require

# Scaleway Object Storage settings
S3Settings__ServiceUrl=https://s3.fr-par.scw.cloud
S3Settings__BucketName=<YOUR_BUCKET_NAME>
S3Settings__BackgroundsContainer=backgrounds
S3Settings__AccessKey=<YOUR_ACCESS_KEY>
S3Settings__SecretKey=<YOUR_SECRET_KEY>

# Application settings
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=http://+:80
EOF
```

Replace the placeholders with your actual Scaleway service details:
- `<POSTGRES_ENDPOINT>`: Your Scaleway PostgreSQL instance endpoint (e.g., `rdb-postgresql-instance-123456.database.cloud.gra.eu-west-1.scw.cloud`)
- `<DB_USERNAME>`: Your PostgreSQL username
- `<DB_PASSWORD>`: Your PostgreSQL password
- `<YOUR_BUCKET_NAME>`: Your Scaleway object storage bucket name
- `<YOUR_ACCESS_KEY>`: Your Scaleway access key
- `<YOUR_SECRET_KEY>`: Your Scaleway secret key

## Step 3: Run the Container with Scaleway Services

Run the container using the environment file:

```bash
docker run -d --name yuzu-app \
  --env-file scaleway-services.env \
  -p 8080:80 \
  yuzu:latest
```

This command:
1. Runs the container in detached mode (`-d`)
2. Names it "yuzu-app" (`--name yuzu-app`)
3. Uses the environment variables from `scaleway-services.env` (`--env-file`)
4. Maps port 8080 on your host to port 80 in the container (`-p 8080:80`)
5. Uses the image you built earlier (`yuzu:latest`)

## Step 4: Verify the Container is Running

Check that the container is running and view its logs:

```bash
# Verify the container is running
docker ps

# View container logs
docker logs yuzu-app

# Check container health
docker inspect --format='{{json .State.Health}}' yuzu-app | jq
```

## Step 5: Access the Application

Access the Yuzu application in your web browser at:

```
http://localhost:8080
```

## Troubleshooting

### PostgreSQL Connection Issues

If the container can't connect to your Scaleway PostgreSQL:

```bash
# Check container logs for PostgreSQL connection errors
docker logs yuzu-app | grep -i "postgres\|database\|connection"

# Enter the container to troubleshoot
docker exec -it yuzu-app bash

# Inside the container, install PostgreSQL client tools
apt-get update && apt-get install -y postgresql-client

# Test connection to PostgreSQL
PGPASSWORD=<DB_PASSWORD> psql -h <POSTGRES_ENDPOINT> -U <DB_USERNAME> -d yuzu -c "SELECT 1;"
```

### Object Storage Connection Issues

If there are issues with the S3 object storage:

```bash
# Check container logs for S3 connection errors
docker logs yuzu-app | grep -i "s3\|storage\|bucket"

# Enter the container to troubleshoot
docker exec -it yuzu-app bash

# Install tools for S3 testing
apt-get update && apt-get install -y curl

# Test S3 connection
curl -I "https://s3.fr-par.scw.cloud"
```

### Updating Environment Variables

If you need to update environment variables:

```bash
# Stop and remove the container
docker stop yuzu-app
docker rm yuzu-app

# Edit the environment file
nano scaleway-services.env

# Run the container again with updated variables
docker run -d --name yuzu-app \
  --env-file scaleway-services.env \
  -p 8080:80 \
  yuzu:latest
```

## Running with Direct Environment Variables

Alternatively, you can run the container with environment variables directly on the command line:

```bash
docker run -d --name yuzu-app \
  -e DataStorageConfig__ConnectionString="Host=<POSTGRES_ENDPOINT>;Database=yuzu;Username=<DB_USERNAME>;Password=<DB_PASSWORD>;SslMode=Require" \
  -e S3Settings__ServiceUrl="https://s3.fr-par.scw.cloud" \
  -e S3Settings__BucketName="<YOUR_BUCKET_NAME>" \
  -e S3Settings__BackgroundsContainer="backgrounds" \
  -e S3Settings__AccessKey="<YOUR_ACCESS_KEY>" \
  -e S3Settings__SecretKey="<YOUR_SECRET_KEY>" \
  -e ASPNETCORE_ENVIRONMENT="Production" \
  -p 8080:80 \
  yuzu:latest
```

## Adding Email Services

If you need local email testing, you can add MailHog:

```bash
# Run MailHog container for email testing
docker run -d --name mailhog \
  -p 1025:1025 \
  -p 8025:8025 \
  mailhog/mailhog

# Connect the Yuzu container to MailHog
docker run -d --name yuzu-app \
  --link mailhog \
  --env-file scaleway-services.env \
  -e MailConnectionConfig__smtpServer="mailhog" \
  -e MailConnectionConfig__smtpPort="1025" \
  -p 8080:80 \
  yuzu:latest
```

You can access the MailHog web interface at http://localhost:8025 to view captured emails.

## Preparing for Kubernetes

After confirming your container works with Scaleway services, push it to your registry:

```bash
# Tag the image for Scaleway Container Registry
docker tag yuzu:latest rg.fr-par.scw.cloud/your-namespace/yuzu:latest

# Push to Scaleway Container Registry
docker login rg.fr-par.scw.cloud -u nologin -p $SCW_SECRET_KEY
docker push rg.fr-par.scw.cloud/your-namespace/yuzu:latest
```

Then update your Kubernetes deployment to use this image and the same environment variables.

## Restarting or Recreating the Container

To restart the container:

```bash
docker restart yuzu-app
```

To recreate the container:

```bash
docker stop yuzu-app
docker rm yuzu-app
docker run -d --name yuzu-app \
  --env-file scaleway-services.env \
  -p 8080:80 \
  yuzu:latest
```