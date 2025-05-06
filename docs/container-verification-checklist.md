# Container Verification Checklist for Yuzu

Use this checklist to verify that your Yuzu container is working correctly before deploying to Kubernetes.

## Build and Push Verification

- [ ] Container builds successfully
  ```bash
  docker build -t yourusername/yuzu:latest .
  ```

- [ ] Container can be pulled from registry
  ```bash
  docker pull yourusername/yuzu:latest
  ```

- [ ] Image size is reasonable (should be under 350MB)
  ```bash
  docker images yourusername/yuzu:latest
  ```

## Local Runtime Verification

- [ ] Container starts successfully
  ```bash
  docker run -d --name yuzu-test -p 8080:80 yourusername/yuzu:latest
  ```

- [ ] Container health check passes
  ```bash
  docker inspect --format='{{json .State.Health}}' yuzu-test | jq
  ```

- [ ] Container log output shows no errors
  ```bash
  docker logs yuzu-test
  ```

- [ ] Application responds on HTTP port
  ```bash
  curl -I http://localhost:8080
  ```

## Database Connection Verification

- [ ] Application can connect to Scaleway PostgreSQL
  ```bash
  # Check application logs for successful connection
  docker logs yuzu-test | grep -i "database\|connection\|postgres"
  
  # Check application health endpoint
  curl http://localhost:8080/health
  ```

- [ ] Application can initialize or migrate database schema
  ```bash
  # Check application logs for migration or initialization messages
  docker logs yuzu-test | grep -i "migration\|schema\|initialize"
  ```

## Storage Connection Verification

- [ ] Application can connect to S3 storage
  ```bash
  # Check application logs for S3 connection
  docker logs yuzu-test | grep -i "s3\|storage\|bucket"
  ```

- [ ] Application can read and write to S3
  ```bash
  # Access a page that would load background images
  curl -I http://localhost:8080/Settings
  ```

## Features Verification

- [ ] User registration works
  ```bash
  # Test registration by accessing the page
  curl -I http://localhost:8080/Account/Register
  ```

- [ ] Authentication works
  ```bash
  # Test login page
  curl -I http://localhost:8080/Account/Login
  ```

- [ ] Application specific features work
  ```bash
  # Access the designer page
  curl -I http://localhost:8080/Designer
  ```

## Security Verification

- [ ] Container is not running as root
  ```bash
  docker exec yuzu-test id
  # Should show uid=1000(dotnetuser) and not root
  ```

- [ ] Container has minimal installed packages
  ```bash
  docker exec yuzu-test apt list --installed | wc -l
  # Should be minimal, typically around 50-100 packages
  ```

- [ ] Sensitive information is not exposed in the container
  ```bash
  # Check for sensitive environment variables
  docker inspect yuzu-test --format='{{range .Config.Env}}{{println .}}{{end}}' | grep -i "key\|password\|secret"
  ```

## Kubernetes Compatibility Verification

- [ ] Container has appropriate resource limits
  ```bash
  # Check Kubernetes deployment YAML
  grep -i "resources" yuzu-deployment.yaml
  ```

- [ ] Container works with Kubernetes environment variables
  ```bash
  docker run -d --name yuzu-k8s-test -p 8081:80 \
    -e KUBERNETES_SERVICE_HOST=dummy \
    -e ASPNETCORE_ENVIRONMENT=Production \
    yourusername/yuzu:latest
  
  docker logs yuzu-k8s-test | grep -i "kubernetes"
  ```

- [ ] Container restart behavior is appropriate
  ```bash
  # Test container restart
  docker restart yuzu-test
  sleep 10
  docker ps | grep yuzu-test
  ```

## Performance Verification

- [ ] Container startup time is reasonable
  ```bash
  time docker run --name yuzu-perf-test -p 8082:80 yourusername/yuzu:latest
  ```

- [ ] Container memory usage is stable
  ```bash
  docker stats --no-stream yuzu-test
  ```

- [ ] Application response time is acceptable
  ```bash
  time curl -s http://localhost:8080
  ```

## Environment-Specific Verification

- [ ] Container works with different environment variables
  ```bash
  docker run -d --name yuzu-env-test -p 8083:80 \
    -e ASPNETCORE_ENVIRONMENT=Staging \
    yourusername/yuzu:latest
  ```

- [ ] Container handles configuration inheritance correctly
  ```bash
  # Create a custom config
  mkdir -p $(pwd)/config
  echo '{"Logging":{"LogLevel":{"Default":"Debug"}}}' > $(pwd)/config/appsettings.Production.json
  
  # Run with mounted config
  docker run -d --name yuzu-config-test -p 8084:80 \
    -v $(pwd)/config:/app/config \
    -e DOTNET_ConfigurationPath=/app/config \
    yourusername/yuzu:latest
  
  # Check if debug logging is enabled
  docker logs yuzu-config-test | grep -i "debug"
  ```

## Cleanup

- [ ] Remove test containers
  ```bash
  docker rm -f yuzu-test yuzu-k8s-test yuzu-perf-test yuzu-env-test yuzu-config-test
  ```

- [ ] Optimize final image if necessary
  ```bash
  # Check for optimization opportunities
  docker history yourusername/yuzu:latest
  ```

## Final Verification for Kubernetes

- [ ] Container image is tagged properly for Kubernetes
  ```bash
  docker tag yourusername/yuzu:latest rg.fr-par.scw.cloud/your-namespace/yuzu:latest
  docker push rg.fr-par.scw.cloud/your-namespace/yuzu:latest
  ```

- [ ] Kubernetes deployment refers to the correct image
  ```bash
  grep -i "image:" yuzu-deployment.yaml
  ```

- [ ] Kubernetes deployment has proper health checks
  ```bash
  grep -i "readinessProbe\|livenessProbe" yuzu-deployment.yaml
  ```

- [ ] Kubernetes secrets are configured for sensitive data
  ```bash
  grep -i "secretKeyRef" yuzu-deployment.yaml
  ```