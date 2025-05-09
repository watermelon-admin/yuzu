using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using System.Net.Mime;
using System.Text.Json;

namespace Yuzu.Web.HealthChecks;

public static class HealthCheckExtensions
{
    public static IServiceCollection AddYuzuHealthChecks(this IServiceCollection services)
    {
        services.AddHealthChecks()
            // Add basic liveness check with different name to avoid collision with ServiceDefaults
            .AddCheck("web_liveness", () => HealthCheckResult.Healthy(), new[] { "live" })
            // Add readiness check
            .AddCheck<DatabaseHealthCheck>("database", 
                failureStatus: HealthStatus.Degraded,
                tags: new[] { "ready", "db" })
            // Add S3 storage check
            .AddCheck<S3StorageHealthCheck>("s3storage",
                failureStatus: HealthStatus.Degraded,
                tags: new[] { "ready", "storage" });
            
        return services;
    }
    
    public static WebApplication MapYuzuHealthChecks(this WebApplication app)
    {
        // Basic health endpoint options with JSON response
        var healthOptions = new HealthCheckOptions 
        {
            ResponseWriter = HealthCheckResponseWriter.WriteResponse
        };
        
        var liveOptions = new HealthCheckOptions
        {
            Predicate = r => r.Tags.Contains("live"),
            ResponseWriter = HealthCheckResponseWriter.WriteResponse
        };
        
        var readyOptions = new HealthCheckOptions
        {
            Predicate = r => r.Tags.Contains("ready"),
            ResponseWriter = HealthCheckResponseWriter.WriteResponse
        };
        
        // Map standard health endpoints using standard convention paths
        
        // Map primary health endpoint - used for overall application health
        app.MapHealthChecks("/health", healthOptions);
        
        // Map alive endpoint for basic liveness with live tag predicate
        app.MapHealthChecks("/alive", liveOptions);
        
        // Map standard Kubernetes readiness probe endpoint 
        app.MapHealthChecks("/ready", readyOptions);
        
        // Map standard Kubernetes liveness probe endpoint
        app.MapHealthChecks("/healthz", healthOptions);
        
        return app;
    }
}