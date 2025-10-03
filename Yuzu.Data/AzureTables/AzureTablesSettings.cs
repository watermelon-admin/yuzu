namespace Yuzu.Data.AzureTables
{
    /// <summary>
    /// Configuration settings for Azure Table Storage
    /// </summary>
    public class AzureTablesSettings
    {
        /// <summary>
        /// Whether to use Azure Managed Identity for authentication instead of connection strings.
        /// When true, uses DefaultAzureCredential for production deployments.
        /// When false, uses connection string from ConnectionStrings:AzureTables.
        /// </summary>
        /// <remarks>
        /// <para><strong>Development:</strong> Set to false and use Azurite connection string</para>
        /// <para><strong>Production:</strong> Set to true and configure managed identity in Azure</para>
        /// <code>
        /// {
        ///   "AzureTablesSettings": {
        ///     "UseManagedIdentity": true,
        ///     "AccountUri": "https://youraccount.table.core.windows.net/"
        ///   }
        /// }
        /// </code>
        /// </remarks>
        public bool UseManagedIdentity { get; set; } = false;

        /// <summary>
        /// The Azure Storage account URI for Table Storage (required when UseManagedIdentity is true)
        /// Format: https://{accountname}.table.core.windows.net/
        /// </summary>
        /// <example>https://mystorageaccount.table.core.windows.net/</example>
        public string AccountUri { get; set; } = string.Empty;
    }
}
