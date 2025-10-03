using Azure.Data.Tables;
using Azure.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Yuzu.Data.AzureTables
{
    /// <summary>
    /// Factory for creating TableServiceClient instances with support for both
    /// connection strings and Azure Managed Identity authentication
    /// </summary>
    public class TableServiceClientFactory
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<TableServiceClientFactory> _logger;
        private readonly AzureTablesSettings _settings;
        private readonly Lazy<TableServiceClient> _client;

        public TableServiceClientFactory(
            IConfiguration configuration,
            ILogger<TableServiceClientFactory> logger,
            IOptions<AzureTablesSettings> settings)
        {
            _configuration = configuration;
            _logger = logger;
            _settings = settings.Value;
            _client = new Lazy<TableServiceClient>(CreateClient);
        }

        /// <summary>
        /// Gets a TableServiceClient instance (singleton per factory)
        /// </summary>
        public TableServiceClient GetServiceClient() => _client.Value;

        /// <summary>
        /// Gets a TableClient for a specific table
        /// </summary>
        /// <param name="tableName">Name of the table</param>
        /// <returns>TableClient instance</returns>
        public TableClient GetTableClient(string tableName)
        {
            return GetServiceClient().GetTableClient(tableName);
        }

        private TableServiceClient CreateClient()
        {
            if (_settings.UseManagedIdentity)
            {
                // Use Managed Identity authentication for production
                if (string.IsNullOrEmpty(_settings.AccountUri))
                {
                    throw new InvalidOperationException(
                        "AzureTablesSettings:AccountUri must be configured when UseManagedIdentity is true");
                }

                _logger.LogInformation(
                    "Creating TableServiceClient with Managed Identity for account: {AccountUri}",
                    _settings.AccountUri);

                // DefaultAzureCredential automatically tries:
                // 1. Environment variables (AZURE_CLIENT_ID, AZURE_TENANT_ID, AZURE_CLIENT_SECRET)
                // 2. Managed Identity (in Azure)
                // 3. Visual Studio / Azure CLI credentials (in development)
                var credential = new DefaultAzureCredential();
                return new TableServiceClient(new Uri(_settings.AccountUri), credential);
            }
            else
            {
                // Use connection string authentication for development
                var connectionString = _configuration.GetConnectionString("AzureTables")
                    ?? "UseDevelopmentStorage=true";

                _logger.LogInformation(
                    "Creating TableServiceClient with connection string (UseManagedIdentity=false)");

                return new TableServiceClient(connectionString);
            }
        }
    }
}
