# Kubernetes Health Probes

This document explains how health probes are implemented in the Yuzu application for Kubernetes deployment.

## Health Endpoints

The application exposes standard health endpoints that Kubernetes can use to monitor the application's status:

| Endpoint | Purpose | Kubernetes Probe | Tags |
|----------|---------|-----------------|------|
| `/health` | General health check | Startup | All checks |
| `/healthz` | Liveness check | Liveness | All checks |
| `/ready` | Readiness check | Readiness | "ready" |
| `/alive` | Basic application liveness | - | "live" |

## Health Check Implementation

Health checks are implemented using ASP.NET Core's built-in health check system, with custom checks for:

1. **Database Connection**: Checks if the PostgreSQL database is accessible
2. **S3 Storage Connection**: Checks if the Scaleway S3 storage is accessible

The implementation is in the following files:
- `/Yuzu.Web/HealthChecks/DatabaseHealthCheck.cs`
- `/Yuzu.Web/HealthChecks/S3StorageHealthCheck.cs`
- `/Yuzu.Web/HealthChecks/HealthCheckExtensions.cs`

## Kubernetes Probe Configuration

The Kubernetes deployment uses the following probe configuration:

### Liveness Probe
- **Path**: `/healthz`
- **Initial Delay**: 30 seconds
- **Period**: 30 seconds
- **Timeout**: 5 seconds
- **Failure Threshold**: 3

The liveness probe checks if the application is running and responsive. If this probe fails, Kubernetes will restart the container.

### Readiness Probe
- **Path**: `/ready`
- **Initial Delay**: 15 seconds
- **Period**: 10 seconds
- **Timeout**: 3 seconds
- **Failure Threshold**: 3

The readiness probe checks if the application is ready to receive traffic. If this probe fails, Kubernetes will stop sending traffic to the pod.

### Startup Probe
- **Path**: `/health`
- **Initial Delay**: 5 seconds
- **Period**: 5 seconds
- **Timeout**: 3 seconds
- **Failure Threshold**: 20

The startup probe gives the application time to bootstrap. It allows for a longer startup time before the liveness probe kicks in.

## Troubleshooting

If pods are not becoming ready or are being restarted, check the following:

1. Verify database connection settings
2. Verify S3 connection settings
3. Check the logs for any errors during startup
4. Ensure the health endpoints are accessible within the cluster

You can test the health endpoints manually by port-forwarding to the pod:

```bash
kubectl port-forward pod/yuzu-web-pod-name 8080:80
curl http://localhost:8080/health
curl http://localhost:8080/ready
curl http://localhost:8080/healthz
curl http://localhost:8080/alive
```

## References

- [Kubernetes Probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [ASP.NET Core Health Checks](https://docs.microsoft.com/en-us/aspnet/core/host-and-deploy/health-checks)