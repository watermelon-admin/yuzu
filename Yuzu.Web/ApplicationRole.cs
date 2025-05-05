using Microsoft.AspNetCore.Identity;

namespace Yuzu.Web
{
    /// <summary>
    /// Custom application role with additional description property
    /// </summary>
    public class ApplicationRole : IdentityRole
    {
        public string Description { get; set; } = string.Empty;
    }
}
