using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
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
        private readonly YuzuDbContext _dbContext;
        private readonly ILogger<UserDataCleanupService> _logger;
        
        /// <summary>
        /// Initializes a new instance of the UserDataCleanupService class
        /// </summary>
        /// <param name="userDataService">The user data service</param>
        /// <param name="breakService">The break service</param>
        /// <param name="breakTypeService">The break type service</param>
        /// <param name="backgroundImageService">The background image service</param>
        /// <param name="dbContext">The database context</param>
        /// <param name="logger">The logger</param>
        public UserDataCleanupService(
            IUserDataService userDataService,
            IBreakService breakService,
            IBreakTypeService breakTypeService,
            IBackgroundImageService backgroundImageService,
            YuzuDbContext dbContext,
            ILogger<UserDataCleanupService> logger)
        {
            _userDataService = userDataService ?? throw new ArgumentNullException(nameof(userDataService));
            _breakService = breakService ?? throw new ArgumentNullException(nameof(breakService));
            _breakTypeService = breakTypeService ?? throw new ArgumentNullException(nameof(breakTypeService));
            _backgroundImageService = backgroundImageService ?? throw new ArgumentNullException(nameof(backgroundImageService));
            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
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
            
            // Use a transaction to ensure atomicity of the entire operation
            using var transaction = await _dbContext.Database.BeginTransactionAsync();
            try
            {
                // Delete data in order of dependencies (child entities first, then parents)
                
                // 1. Delete all breaks directly with SQL for better performance
                int deletedBreaksCount = await _dbContext.Database.ExecuteSqlInterpolatedAsync(
                    $"DELETE FROM \"Data_Breaks\" WHERE user_id = {userId}");
                _logger.LogInformation("Deleted {Count} breaks for user {UserId}", deletedBreaksCount, userId);
                
                // 2. Delete all break types directly with SQL
                int deletedBreakTypesCount = await _dbContext.Database.ExecuteSqlInterpolatedAsync(
                    $"DELETE FROM \"Data_BreakTypes\" WHERE user_id = {userId}");
                _logger.LogInformation("Deleted {Count} break types for user {UserId}", deletedBreakTypesCount, userId);
                
                // 3. Delete all user data items directly with SQL
                int deletedUserDataCount = await _dbContext.Database.ExecuteSqlInterpolatedAsync(
                    $"DELETE FROM \"Data_UserData\" WHERE user_id = {userId}");
                _logger.LogInformation("Deleted {Count} user data items for user {UserId}", deletedUserDataCount, userId);
                
                // 4. Delete background images (use the service since we might need to clean up S3 storage too)
                // We do this outside the transaction if it fails, as it involves external systems
                await _backgroundImageService.DeleteAllForUserAsync(userId);
                
                // Commit the transaction
                await transaction.CommitAsync();
                _logger.LogInformation("Successfully deleted database data for user {UserId}", userId);
            }
            catch (Exception ex)
            {
                // Rollback the transaction on error
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Transaction failed while deleting user data for {UserId}", userId);
                throw;
            }
            
            // Delete background images separately since it may involve external storage
            try
            {
                await _backgroundImageService.DeleteAllForUserAsync(userId);
                _logger.LogInformation("Deleted all background images for user {UserId}", userId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting background images for user {UserId}", userId);
                throw;
            }
            
            _logger.LogInformation("Successfully deleted all data for user {UserId}", userId);
        }
    }
}