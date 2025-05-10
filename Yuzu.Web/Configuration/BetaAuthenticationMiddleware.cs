using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using System.Threading.Tasks;

namespace Yuzu.Web.Configuration
{
    /// <summary>
    /// Middleware to enforce beta mode authentication restrictions
    /// </summary>
    public class BetaAuthenticationMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly BetaSettings _betaSettings;

        public BetaAuthenticationMiddleware(RequestDelegate next, IOptions<BetaSettings> betaSettings)
        {
            _next = next;
            _betaSettings = betaSettings.Value;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            // Skip middleware if beta mode is not enabled
            if (!_betaSettings.Enabled)
            {
                await _next(context);
                return;
            }

            // Get the lowercased path
            string path = context.Request.Path.Value?.ToLowerInvariant() ?? string.Empty;

            // Allow the following paths without authentication:
            // 1. Static resources
            // 2. Health checks and system pages
            // 3. The beta login page itself and related authentication paths
            bool isAllowedWithoutAuth =
                path.StartsWith("/lib/") ||
                path.StartsWith("/css/") ||
                path.StartsWith("/js/") ||
                path.StartsWith("/img/") ||
                path.StartsWith("/fonts/") ||
                path.StartsWith("/favicon") ||
                path.StartsWith("/health") ||
                path.StartsWith("/account/loginbeta") ||
                path.StartsWith("/account/externallogin") ||
                path.StartsWith("/signin-") ||  // OAuth endpoints like /signin-google
                path.Equals("/robots.txt");

            if (isAllowedWithoutAuth)
            {
                await _next(context);
                return;
            }

            // If user is authenticated, let them pass
            if (context.User.Identity != null && context.User.Identity.IsAuthenticated)
            {
                await _next(context);
                return;
            }

            // If user is not authenticated and path requires auth, redirect to beta login
            context.Response.Redirect("/Account/LoginBeta");
        }
    }

    // Extension methods to add the middleware to the application pipeline
    public static class BetaAuthenticationMiddlewareExtensions
    {
        public static IApplicationBuilder UseBetaAuthentication(this IApplicationBuilder builder)
        {
            return builder.UseMiddleware<BetaAuthenticationMiddleware>();
        }
    }
}