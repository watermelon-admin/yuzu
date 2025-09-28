using Microsoft.Extensions.Diagnostics.HealthChecks;
using Azure.Data.Tables;
using Microsoft.Extensions.Configuration;

namespace Yuzu.Web.HealthChecks;

public class DatabaseHealthCheck : IHealthCheck
{
    private readonly IConfiguration _configuration;

    public DatabaseHealthCheck(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        try
        {
            var connectionString = _configuration.GetConnectionString("AzureTables");
            if (string.IsNullOrEmpty(connectionString))
            {
                return HealthCheckResult.Unhealthy("Azure Tables connection string is not configured.");
            }

            var serviceClient = new TableServiceClient(connectionString);

            // Try to get service properties to check connectivity
            var properties = await serviceClient.GetPropertiesAsync(cancellationToken);

            if (properties != null)
            {
                return HealthCheckResult.Healthy("Azure Tables connection is healthy.");
            }

            return HealthCheckResult.Degraded("Azure Tables connection is not available.");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("Azure Tables health check failed.", ex);
        }
    }
}