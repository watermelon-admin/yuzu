using ElCamino.AspNetCore.Identity.AzureTable;
using ElCamino.AspNetCore.Identity.AzureTable.Model;
using Azure.Data.Tables;

namespace Yuzu.Web.Data
{
    public class ApplicationDbContext : IdentityCloudContext
    {
        public ApplicationDbContext(IdentityConfiguration config, TableServiceClient client)
            : base(config, client)
        {
        }
    }
}