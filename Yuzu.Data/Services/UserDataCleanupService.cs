using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Yuzu.Data.Services.Interfaces;

namespace Yuzu.Data.Services
{
    /// <summary>
    /// Service implementation for cleaning up user data
    /// </summary>
    public class UserDataCleanupService : IUserDataCleanupService
    {
        private readonly IUserDataService _userDataService;
        private readonly IBreakService _breakService;
        private readonly IBreakTypeService _breakTypeService;
        private readonly IBackgroundImageService _backgroundImageService;
        private readonly ILogger<UserDataCleanupService> _logger;

        /// <summary>
        /// Initializes a new instance of the UserDataCleanupService class
        /// </summary>
        /// <param name="userDataService">The user data service</param>
        /// <param name="breakService">The break service</param>
        /// <param name="breakTypeService">The break type service</param>
        /// <param name="backgroundImageService">The background image service</param>
        /// <param name="logger">The logger</param>
        public UserDataCleanupService(
            IUserDataService userDataService,
            IBreakService breakService,
            IBreakTypeService breakTypeService,
            IBackgroundImageService backgroundImageService,
            ILogger<UserDataCleanupService> logger)
        {
            _userDataService = userDataService ?? throw new ArgumentNullException(nameof(userDataService));
            _breakService = breakService ?? throw new ArgumentNullException(nameof(breakService));
            _breakTypeService = breakTypeService ?? throw new ArgumentNullException(nameof(breakTypeService));
            _backgroundImageService = backgroundImageService ?? throw new ArgumentNullException(nameof(backgroundImageService));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }
        
        /// <inheritdoc />
        public async Task DeleteAllUserDataAsync(string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                throw new ArgumentException("User ID cannot be null or empty", nameof(userId));
            }
            
            _logger.LogInformation("Starting deletion of all data for user {UserId}", userId);

            try
            {
                // Delete data in order of dependencies (child entities first, then parents)

                // 1. Delete all breaks
                await _breakService.DeleteAllForUserAsync(userId);
                _logger.LogInformation("Deleted all breaks for user {UserId}", userId);

                // 2. Delete all break types
                await _breakTypeService.DeleteAllForUserAsync(userId);
                _logger.LogInformation("Deleted all break types for user {UserId}", userId);

                // 3. Delete all user data items
                await _userDataService.DeleteAllForUserAsync(userId);
                _logger.LogInformation("Deleted all user data items for user {UserId}", userId);

                // 4. Delete all background images (might involve S3 storage cleanup)
                await _backgroundImageService.DeleteAllForUserAsync(userId);
                _logger.LogInformation("Deleted all background images for user {UserId}", userId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error while deleting user data for {UserId}", userId);
                throw;
            }
            
            _logger.LogInformation("Successfully deleted all data for user {UserId}", userId);
        }
    }
}