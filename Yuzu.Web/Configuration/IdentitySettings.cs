namespace Yuzu.Web.Configuration
{
    /// <summary>
    /// Configuration settings for ASP.NET Core Identity with Azure Tables
    /// </summary>
    public class IdentitySettings
    {
        /// <summary>
        /// Table prefix for Identity tables in Azure Storage
        /// </summary>
        public string TablePrefix { get; set; } = "AspNetIdentity";

        /// <summary>
        /// Name of the index table
        /// </summary>
        public string IndexTableName { get; set; } = "AspNetIndex";

        /// <summary>
        /// Name of the roles table
        /// </summary>
        public string RoleTableName { get; set; } = "AspNetRoles";

        /// <summary>
        /// Name of the users table
        /// </summary>
        public string UserTableName { get; set; } = "AspNetUsers";
    }
}