using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Yuzu.Data.Models;
using Yuzu.Data.Services.Interfaces;

namespace Yuzu.Data.Services
{
    /// <summary>
    /// Service implementation for managing user data
    /// </summary>
    public class UserDataService : IUserDataService
    {
        private readonly YuzuDbContext _dbContext;
        private readonly ILogger<UserDataService> _logger;
        
        /// <summary>
        /// Initializes a new instance of the UserDataService class
        /// </summary>
        /// <param name="dbContext">The database context</param>
        /// <param name="logger">The logger</param>
        public UserDataService(YuzuDbContext dbContext, ILogger<UserDataService> logger)
        {
            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }
        
        /// <inheritdoc />
        public async Task<List<UserDataItem>> GetAllAsync()
        {
            try
            {
                return await _dbContext.UserData.ToListAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting all user data items");
                throw;
            }
        }
        
        /// <inheritdoc />
        public async Task<List<UserDataItem>> GetByUserIdAsync(string userId)
        {
            try
            {
                return await _dbContext.UserData
                    .Where(ud => ud.UserId == userId)
                    .ToListAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting user data items for user {UserId}", userId);
                throw;
            }
        }
        
        /// <inheritdoc />
        public async Task<UserDataItem?> GetAsync(string userId, string dataKey)
        {
            try
            {
                return await _dbContext.UserData
                    .FirstOrDefaultAsync(ud => ud.UserId == userId && ud.DataKey == dataKey);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting user data item {DataKey} for user {UserId}", dataKey, userId);
                throw;
            }
        }
        
        /// <inheritdoc />
        public async Task<UserDataItem> CreateAsync(UserDataItem userDataItem)
        {
            try
            {
                // Ensure UpdatedAt is set
                userDataItem.UpdatedAt = DateTime.UtcNow;
                
                _dbContext.UserData.Add(userDataItem);
                await _dbContext.SaveChangesAsync();
                return userDataItem;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating user data item {DataKey} for user {UserId}", userDataItem.DataKey, userDataItem.UserId);
                throw;
            }
        }
        
        /// <inheritdoc />
        public async Task<UserDataItem> UpdateAsync(UserDataItem userDataItem)
        {
            try
            {
                var existingItem = await _dbContext.UserData
                    .FirstOrDefaultAsync(ud => ud.UserId == userDataItem.UserId && ud.DataKey == userDataItem.DataKey);
                    
                if (existingItem == null)
                {
                    throw new KeyNotFoundException($"User data item with key {userDataItem.DataKey} for user {userDataItem.UserId} not found");
                }
                
                // Update properties
                existingItem.Value = userDataItem.Value;
                existingItem.UpdatedAt = DateTime.UtcNow;
                
                await _dbContext.SaveChangesAsync();
                return existingItem;
            }
            catch (KeyNotFoundException)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating user data item {DataKey} for user {UserId}", userDataItem.DataKey, userDataItem.UserId);
                throw;
            }
        }
        
        /// <inheritdoc />
        public async Task<UserDataItem> UpsertAsync(UserDataItem userDataItem)
        {
            try
           {
                var existingItem = await _dbContext.UserData
                    .FirstOrDefaultAsync(ud => ud.UserId == userDataItem.UserId && ud.DataKey == userDataItem.DataKey);
                    
                if (existingItem == null)
                {
                    // Create new item
                    userDataItem.CreatedAt = DateTime.UtcNow;
                    userDataItem.UpdatedAt = DateTime.UtcNow;
                    
                    _dbContext.UserData.Add(userDataItem);
                    await _dbContext.SaveChangesAsync();
                    return userDataItem;
                }
                else
                {
                    // Update existing item
                    existingItem.Value = userDataItem.Value;
                    existingItem.UpdatedAt = DateTime.UtcNow;
                    
                    await _dbContext.SaveChangesAsync();
                    return existingItem;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error upserting user data item {DataKey} for user {UserId}", userDataItem.DataKey, userDataItem.UserId);
                throw;
            }
        }
        
        /// <inheritdoc />
        public async Task<bool> DeleteAsync(string userId, string dataKey)
        {
            try
            {
                var userDataItem = await _dbContext.UserData
                    .FirstOrDefaultAsync(ud => ud.UserId == userId && ud.DataKey == dataKey);
                    
                if (userDataItem == null)
                {
                    return false;
                }
                
                _dbContext.UserData.Remove(userDataItem);
                await _dbContext.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting user data item {DataKey} for user {UserId}", dataKey, userId);
                throw;
            }
        }
        
        /// <inheritdoc />
        public async Task<List<UserDataItem>> InitializeDefaultsAsync(string userId, string homeTimeZone = "UTC")
        {
            try
            {
                // Check if user already has any settings
                var exists = await _dbContext.UserData
                    .AnyAsync(ud => ud.UserId == userId);
                    
                if (exists)
                {
                    // User already has settings, no need to initialize
                    return await GetByUserIdAsync(userId);
                }
                
                // Ensure we have a valid timezone value, defaulting to UTC if empty or invalid
                if (string.IsNullOrWhiteSpace(homeTimeZone))
                {
                    homeTimeZone = "UTC";
                    _logger.LogWarning("Empty home timezone provided for user {UserId}, using UTC as fallback", userId);
                }
                
                // Create default settings
                var defaultSettings = new List<UserDataItem>
                {
                    new UserDataItem
                    {
                        UserId = userId,
                        DataKey = UserDataKey.HomeTimeZone.ToString(),
                        Value = homeTimeZone,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    },
                    new UserDataItem
                    {
                        UserId = userId,
                        DataKey = UserDataKey.ConfirmBreakScreenExit.ToString(),
                        Value = "true",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    },
                    new UserDataItem
                    {
                        UserId = userId,
                        DataKey = UserDataKey.AdditionalTimeZones.ToString(),
                        Value = string.Empty,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    }
                };
                
                _dbContext.UserData.AddRange(defaultSettings);
                await _dbContext.SaveChangesAsync();
                
                _logger.LogInformation("Initialized default user data for user {UserId} with home timezone {HomeTimeZone}", userId, homeTimeZone);
                return defaultSettings;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error initializing default user data for user {UserId}", userId);
                throw;
            }
        }
        
        /// <inheritdoc />
        public async Task DeleteAllForUserAsync(string userId)
        {
            try
            {
                // Use direct SQL for better performance
                int deletedCount = await _dbContext.Database.ExecuteSqlInterpolatedAsync(
                    $"DELETE FROM user_data WHERE user_id = {userId}");
                
                _logger.LogInformation("Deleted {Count} user data items for user {UserId}", deletedCount, userId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting all user data for user {UserId}", userId);
                throw;
            }
        }
    }
}