using Microsoft.Extensions.Diagnostics.HealthChecks;
using Yuzu.Data;

namespace Yuzu.Web.HealthChecks;

public class DatabaseHealthCheck : IHealthCheck
{
    private readonly YuzuDbContext _dbContext;

    public DatabaseHealthCheck(YuzuDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        try
        {
            // Check if database is accessible
            bool canConnect = await _dbContext.Database.CanConnectAsync(cancellationToken);

            if (canConnect)
            {
                return HealthCheckResult.Healthy("Database connection is healthy.");
            }
            
            return HealthCheckResult.Degraded("Database connection is not available.");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("Database health check failed.", ex);
        }
    }
}