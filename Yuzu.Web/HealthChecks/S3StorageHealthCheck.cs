using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Options;
using Yuzu.Configuration.S3;
using Yuzu.Data.Services.Interfaces;

namespace Yuzu.Web.HealthChecks;

public class S3StorageHealthCheck : IHealthCheck
{
    private readonly IStorageService _storageService;
    private readonly S3Settings _s3Settings;

    public S3StorageHealthCheck(IStorageService storageService, IOptions<S3Settings> s3Settings)
    {
        _storageService = storageService;
        _s3Settings = s3Settings.Value;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        try
        {
            // Check if we can list objects from the backgrounds container
            var objects = await _storageService.ListObjectsAsync(_s3Settings.BackgroundsContainer);
            
            if (objects != null && objects.Any())
            {
                return HealthCheckResult.Healthy("S3 storage connection is healthy.");
            }
            
            return HealthCheckResult.Degraded("S3 storage connection succeeded but no items found.");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("S3 storage health check failed.", ex);
        }
    }
}