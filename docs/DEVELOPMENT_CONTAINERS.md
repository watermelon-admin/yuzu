# Development Containers Setup Guide

This guide explains how to set up and manage the containerized development services required for the Yuzu Break Timer application.

## Required Containers

The development environment uses two containerized services:

1. **Azurite** - Azure Storage Emulator for table storage and blob storage
2. **MailHog** - Email testing server that captures and displays sent emails

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- Command line access (PowerShell, Command Prompt, or Git Bash)

## Quick Start

### Option 1: Run All Services at Once

```bash
# Create and start both containers
docker run -d -p 10000:10000 -p 10001:10001 -p 10002:10002 --name yuzu-azurite mcr.microsoft.com/azure-storage/azurite
docker run -d -p 1025:1025 -p 8025:8025 --name yuzu-mailhog mailhog/mailhog

# Start Yuzu application
dotnet run --project Yuzu.Web/Yuzu.Web.csproj
```

### Option 2: Use Start/Stop Commands

```bash
# Start existing containers (if already created)
docker start yuzu-azurite yuzu-mailhog

# Stop containers when done
docker stop yuzu-azurite yuzu-mailhog
```

## Detailed Setup Instructions

### 1. Azurite (Azure Storage Emulator)

Azurite provides Azure Table Storage and Blob Storage emulation for local development.

#### First-time Setup:
```bash
docker run -d \
  -p 10000:10000 \
  -p 10001:10001 \
  -p 10002:10002 \
  --name yuzu-azurite \
  mcr.microsoft.com/azure-storage/azurite
```

#### Service Details:
- **Container Name**: `yuzu-azurite`
- **Blob Service**: `http://localhost:10000`
- **Queue Service**: `http://localhost:10001`
- **Table Service**: `http://localhost:10002`
- **Connection String**: `UseDevelopmentStorage=true`

#### Verify Installation:
```bash
# Check if container is running
docker ps | grep azurite

# Test blob service endpoint
curl http://localhost:10000
```

### 2. MailHog (Email Testing)

MailHog captures all emails sent by the application during development.

#### First-time Setup:
```bash
docker run -d \
  -p 1025:1025 \
  -p 8025:8025 \
  --name yuzu-mailhog \
  mailhog/mailhog
```

#### Service Details:
- **Container Name**: `yuzu-mailhog`
- **SMTP Server**: `localhost:1025`
- **Web Interface**: `http://localhost:8025`
- **Authentication**: None required

#### Verify Installation:
```bash
# Check if container is running
docker ps | grep mailhog

# Open web interface
# Navigate to http://localhost:8025 in your browser
```

## Daily Development Workflow

### Starting Development Session

1. **Start containers:**
   ```bash
   docker start yuzu-azurite yuzu-mailhog
   ```

2. **Verify services are running:**
   ```bash
   docker ps | grep yuzu
   ```

3. **Start Yuzu application:**
   ```bash
   cd /path/to/yuzu
   dotnet run --project Yuzu.Web/Yuzu.Web.csproj
   ```

4. **Access services:**
   - **Application**: `http://localhost:5000` or `https://localhost:7143`
   - **Email Interface**: `http://localhost:8025`

### Ending Development Session

```bash
# Stop containers (preserves data)
docker stop yuzu-azurite yuzu-mailhog
```

## Container Management

### Status and Monitoring

```bash
# List all containers
docker ps -a

# Check specific containers
docker ps | grep "yuzu-azurite\|yuzu-mailhog"

# View container logs
docker logs yuzu-azurite
docker logs yuzu-mailhog

# Follow live logs
docker logs -f yuzu-mailhog
```

### Data Management

```bash
# Reset Azurite data (removes all tables and data)
docker stop yuzu-azurite
docker rm yuzu-azurite
docker run -d -p 10000:10000 -p 10001:10001 -p 10002:10002 --name yuzu-azurite mcr.microsoft.com/azure-storage/azurite

# Clear MailHog emails (restart container)
docker restart yuzu-mailhog
```

### Troubleshooting

#### Port Conflicts
If you get port binding errors:

```bash
# Check what's using the ports
netstat -ano | findstr "10000\|10001\|10002\|1025\|8025"

# Or use different ports
docker run -d -p 11000:10000 -p 11001:10001 -p 11002:10002 --name yuzu-azurite mcr.microsoft.com/azure-storage/azurite
```

#### Container Already Exists
```bash
# Remove existing container
docker rm yuzu-azurite
docker rm yuzu-mailhog

# Then recreate with the setup commands above
```

#### Service Not Responding
```bash
# Restart containers
docker restart yuzu-azurite yuzu-mailhog

# Check container health
docker exec yuzu-azurite echo "Container is running"
```

## Application Configuration

The Yuzu application is automatically configured to use these services when running in Development mode:

### Azure Storage (appsettings.Development.json)
```json
{
  "ConnectionStrings": {
    "AzureStorage": "UseDevelopmentStorage=true",
    "AzureTables": "UseDevelopmentStorage=true"
  }
}
```

### Email Settings (appsettings.Development.json)
```json
{
  "MailSettings": {
    "SmtpServer": "localhost",
    "SmtpPort": 1025,
    "SmtpUsername": "",
    "SmtpPassword": ""
  }
}
```

## Advanced Usage

### Custom Container Configuration

#### Azurite with Persistent Storage:
```bash
docker run -d \
  -p 10000:10000 -p 10001:10001 -p 10002:10002 \
  --name yuzu-azurite \
  -v azurite-data:/data \
  mcr.microsoft.com/azure-storage/azurite \
  azurite --location /data
```

#### MailHog with Authentication:
```bash
docker run -d \
  -p 1025:1025 -p 8025:8025 \
  --name yuzu-mailhog \
  -e MH_AUTH_FILE=/authfile \
  mailhog/mailhog
```

### Integration with Docker Compose (Optional)

Create `docker-compose.dev.yml`:
```yaml
version: '3.8'
services:
  azurite:
    image: mcr.microsoft.com/azure-storage/azurite
    container_name: yuzu-azurite
    ports:
      - "10000:10000"
      - "10001:10001"
      - "10002:10002"

  mailhog:
    image: mailhog/mailhog
    container_name: yuzu-mailhog
    ports:
      - "1025:1025"
      - "8025:8025"
```

Usage:
```bash
# Start services
docker-compose -f docker-compose.dev.yml up -d

# Stop services
docker-compose -f docker-compose.dev.yml down
```

## Additional Resources

- [Azurite Documentation](https://docs.microsoft.com/en-us/azure/storage/common/storage-use-azurite)
- [MailHog Documentation](https://github.com/mailhog/MailHog)
- [Docker Documentation](https://docs.docker.com/)

## Support

If you encounter issues with the development containers:

1. Check the troubleshooting section above
2. Verify Docker Desktop is running
3. Check the container logs for error messages
4. Ensure no other services are using the required ports
5. Try recreating the containers from scratch