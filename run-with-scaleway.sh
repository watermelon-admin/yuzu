#!/bin/bash
# Script to build and run Yuzu with Scaleway services

# Exit on error
set -e

# Check if scaleway-services.env file exists
if [ ! -f "scaleway-services.env" ]; then
    echo "Error: scaleway-services.env file not found!"
    echo "Please create the file from scaleway-services.env.example and add your credentials."
    exit 1
fi

# Build the Docker image
echo "Building Yuzu Docker image..."
docker build -t yuzu:latest .

# Run MailHog (optional, for email testing)
if [ "$1" == "--with-mailhog" ]; then
    echo "Starting MailHog for email testing..."
    docker rm -f mailhog 2>/dev/null || true
    docker run -d --name mailhog \
        -p 1025:1025 \
        -p 8025:8025 \
        mailhog/mailhog
    
    echo "Adding MailHog configuration to environment..."
    # Create a temporary env file with MailHog settings
    cat scaleway-services.env > scaleway-services.tmp.env
    echo "MailConnectionConfig__smtpServer=mailhog" >> scaleway-services.tmp.env
    echo "MailConnectionConfig__smtpPort=1025" >> scaleway-services.tmp.env
    
    ENV_FILE="scaleway-services.tmp.env"
    echo "MailHog started. Web interface available at: http://localhost:8025"
else
    ENV_FILE="scaleway-services.env"
fi

# Stop any existing Yuzu container
echo "Stopping any existing Yuzu container..."
docker rm -f yuzu-app 2>/dev/null || true

# Run the Yuzu container with Scaleway services
echo "Starting Yuzu container with Scaleway services..."
if [ "$1" == "--with-mailhog" ]; then
    docker run -d --name yuzu-app \
        --link mailhog \
        --env-file "$ENV_FILE" \
        -p 8080:80 \
        yuzu:latest
else
    docker run -d --name yuzu-app \
        --env-file "$ENV_FILE" \
        -p 8080:80 \
        yuzu:latest
fi

# Clean up temp file if it exists
[ -f "scaleway-services.tmp.env" ] && rm scaleway-services.tmp.env

# Wait for the container to be ready
echo "Waiting for Yuzu to start..."
sleep 5

# Check if container is running
if docker ps | grep -q yuzu-app; then
    echo "Yuzu is running! Access it at: http://localhost:8080"
    echo "Container logs:"
    docker logs yuzu-app | tail -n 20
else
    echo "Error: Container failed to start. Check logs:"
    docker logs yuzu-app
    exit 1
fi