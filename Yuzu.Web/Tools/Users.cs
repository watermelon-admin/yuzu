using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Yuzu.Data.Models;

namespace Yuzu.Web.Tools
{
    /// <summary>
    /// Provides utility methods for working with users.
    /// </summary>
    public static class Users
    {
        /// <summary>
        /// Gets the user ID asynchronously with logging, throwing an exception if not found.
        /// </summary>
        /// <param name="userManager">The UserManager used to retrieve the user.</param>
        /// <param name="User">The current user's claims principal.</param>
        /// <param name="logger">Logger for capturing error information.</param>
        /// <returns>The user ID as a string.</returns>
        /// <exception cref="Exception">Thrown when the user ID is null.</exception>
        public static async Task<string?> GetUserId
            (UserManager<ApplicationUser> userManager,
            ClaimsPrincipal User,
            ILogger logger
            )
        {
            logger.LogInformation("Getting user id.");

            var user = await userManager.GetUserAsync(User);
            var userId = user?.Id;
            if (userId == null)
            {
                logger.LogError("User not {userId} not found.", userId);
                throw new Exception("User not found.");
            }
            else
            {
                logger.LogInformation("User {userId} found.", userId);
                return userId;
            }
        }

        /// <summary>
        /// Gets the user ID synchronously, returning null if not found.
        /// Use this when the UserID is optional or when you want to handle the null case.
        /// </summary>
        /// <param name="userManager">The UserManager used to retrieve the user ID.</param>
        /// <param name="User">The current user's claims principal.</param>
        /// <returns>The user ID as a string, or null if not found.</returns>
        public static string? GetUserIdOrNull(UserManager<ApplicationUser> userManager, ClaimsPrincipal User)
        {
            return userManager.GetUserId(User);
        }
        
        /// <summary>
        /// Gets the user ID synchronously, returning a default string if not found.
        /// Use this when you need to ensure a non-null string, even for unauthenticated users.
        /// </summary>
        /// <param name="userManager">The UserManager used to retrieve the user ID.</param>
        /// <param name="User">The current user's claims principal.</param>
        /// <param name="defaultValue">Optional default value to return if user ID is null.</param>
        /// <returns>The user ID as a string, or the default value if not found.</returns>
        public static string GetUserIdOrDefault(UserManager<ApplicationUser> userManager, ClaimsPrincipal User, string defaultValue = "anonymous")
        {
            return userManager.GetUserId(User) ?? defaultValue;
        }

        /// <summary>
        /// Gets the user ID synchronously, throwing an InvalidOperationException if not found.
        /// Use this when you're confident the user should be authenticated.
        /// </summary>
        /// <param name="userManager">The UserManager used to retrieve the user ID.</param>
        /// <param name="User">The current user's claims principal.</param>
        /// <returns>The user ID as a string.</returns>
        /// <exception cref="InvalidOperationException">Thrown when the user ID is null.</exception>
        public static string GetUserIdOrThrow(UserManager<ApplicationUser> userManager, ClaimsPrincipal User)
        {
            var userId = userManager.GetUserId(User);
            if (userId == null)
            {
                throw new InvalidOperationException("User ID cannot be null");
            }
            return userId;
        }

        /// <summary>
        /// Gets the user email asynchronously with logging, throwing an exception if not found.
        /// </summary>
        /// <param name="userManager">The UserManager used to retrieve the user.</param>
        /// <param name="User">The current user's claims principal.</param>
        /// <param name="logger">Logger for capturing error information.</param>
        /// <returns>The user email as a string.</returns>
        /// <exception cref="Exception">Thrown when the user email is null.</exception>
        public static async Task<string?> GetUserEMail
            (UserManager<ApplicationUser> userManager,
            ClaimsPrincipal User,
            ILogger logger
            )
        {
            logger.LogInformation("Getting user email.");
            var user = await userManager.GetUserAsync(User);
            var userEmail = user?.Email;
            if (userEmail == null)
            {
                logger.LogError("User email {userEmail} not found.", userEmail);
                throw new Exception("User email not found.");
            }
            else
            {
                logger.LogInformation("User email {userEmail} found.", userEmail);
                return userEmail;
            }
        }

        /// <summary>
        /// Extension method for PageModel that returns Unauthorized if the user is not authenticated.
        /// </summary>
        /// <param name="page">The page model.</param>
        /// <param name="userManager">The UserManager used to retrieve the user ID.</param>
        /// <returns>null if the user is authenticated, otherwise an UnauthorizedResult.</returns>
        public static IActionResult? EnsureAuthenticated(this PageModel page, UserManager<ApplicationUser> userManager)
        {
            if (userManager.GetUserId(page.User) == null)
            {
                return new UnauthorizedResult();
            }
            return null;
        }
    }
}
