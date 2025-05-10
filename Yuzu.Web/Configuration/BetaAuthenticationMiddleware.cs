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

            // Skip for static files, health checks, and the beta login page itself
            string path = context.Request.Path.Value?.ToLowerInvariant() ?? string.Empty;
            if (path.StartsWith("/lib/") || 
                path.StartsWith("/css/") || 
                path.StartsWith("/js/") || 
                path.StartsWith("/img/") || 
                path.StartsWith("/fonts/") ||
                path.StartsWith("/favicon") || 
                path.StartsWith("/health") ||
                path.StartsWith("/account/loginbeta") ||
                path.Equals("/robots.txt"))
            {
                await _next(context);
                return;
            }

            // If user is not authenticated, redirect to beta login page
            if (!context.User.Identity?.IsAuthenticated ?? true)
            {
                context.Response.Redirect("/Account/LoginBeta");
                return;
            }

            // If we get here, the user is authenticated and beta mode is enabled, so proceed
            await _next(context);
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