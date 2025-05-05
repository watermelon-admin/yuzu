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
    /// Service implementation for managing break types
    /// </summary>
    public class BreakTypeService : IBreakTypeService
    {
        private readonly YuzuDbContext _dbContext;
        private readonly ILogger<BreakTypeService> _logger;

        /// <summary>
        /// Initializes a new instance of the BreakTypeService class
        /// </summary>
        /// <param name="dbContext">The database context</param>
        /// <param name="logger">The logger</param>
        public BreakTypeService(YuzuDbContext dbContext, ILogger<BreakTypeService> logger)
        {
            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <inheritdoc />
        public async Task<List<BreakType>> GetAllAsync(string userId)
        {
            try
            {
                return await _dbContext.BreakTypes
                    .Where(bt => bt.UserId == userId)
                    .OrderBy(bt => bt.SortOrder)
                    .ToListAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting all break types for user {UserId}", userId);
                throw;
            }
        }

        /// <inheritdoc />
        public async Task<BreakType?> GetByIdAsync(int id)
        {
            try
            {
                return await _dbContext.BreakTypes.FindAsync(id);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting break type with ID {Id}", id);
                throw;
            }
        }

        /// <inheritdoc />
        public async Task<BreakType?> GetAsync(string userId, int id)
        {
            if (string.IsNullOrEmpty(userId))
            {
                throw new ArgumentException("User ID cannot be null or empty", nameof(userId));
            }

            try
            {
                var breakType = await _dbContext.BreakTypes
                    .FirstOrDefaultAsync(bt => bt.UserId == userId && bt.Id == id);

                if (breakType == null)
                {
                    _logger.LogInformation("Break type with ID {Id} not found for user {UserId}", id, userId);
                }

                return breakType;
            }
            catch (Exception ex) when (ex is not ArgumentException)
            {
                _logger.LogError(ex, "Error getting break type with ID {Id} for user {UserId}", id, userId);
                throw new InvalidOperationException($"Failed to retrieve break type with ID {id} for user {userId}. See inner exception for details.", ex);
            }
        }

        /// <inheritdoc />
        public async Task<BreakType> CreateAsync(BreakType breakType)
        {
            if (breakType == null)
            {
                throw new ArgumentNullException(nameof(breakType));
            }

            if (string.IsNullOrEmpty(breakType.UserId))
            {
                throw new ArgumentException("Break type must have a valid User ID", nameof(breakType));
            }

            try
            {
                // Ensure UpdatedAt is set
                breakType.UpdatedAt = DateTime.UtcNow;

                _dbContext.BreakTypes.Add(breakType);
                await _dbContext.SaveChangesAsync();

                _logger.LogInformation("Created new break type with ID {Id} for user {UserId}", breakType.Id, breakType.UserId);
                return breakType;
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(ex, "Database error while creating break type for user {UserId}", breakType.UserId);
                throw new InvalidOperationException($"Failed to create break type for user {breakType.UserId}. Database error occurred.", ex);
            }
            catch (Exception ex) when (ex is not ArgumentNullException && ex is not ArgumentException)
            {
                _logger.LogError(ex, "Error creating break type for user {UserId}", breakType.UserId);
                throw new InvalidOperationException($"Failed to create break type for user {breakType.UserId}. See inner exception for details.", ex);
            }
        }

        /// <inheritdoc />
        public async Task<BreakType> UpdateAsync(BreakType breakType)
        {
            try
            {
                // First check if entity exists
                bool exists = await _dbContext.BreakTypes.AnyAsync(bt => bt.Id == breakType.Id);
                if (!exists)
                {
                    throw new KeyNotFoundException($"Break type with ID {breakType.Id} not found");
                }

                // Set timestamp for tracking
                breakType.UpdatedAt = DateTime.UtcNow;

                // Use entity tracking to efficiently update only changed fields
                _dbContext.Entry(breakType).State = EntityState.Modified;

                // Always preserve the original UserId
                _dbContext.Entry(breakType).Property(bt => bt.UserId).IsModified = false;

                // Always preserve the original CreatedAt
                _dbContext.Entry(breakType).Property(bt => bt.CreatedAt).IsModified = false;

                await _dbContext.SaveChangesAsync();

                // Detach entity to prevent tracking issues
                _dbContext.Entry(breakType).State = EntityState.Detached;

                return breakType;
            }
            catch (KeyNotFoundException)
            {
                throw;
            }
            catch (DbUpdateConcurrencyException ex)
            {
                _logger.LogError(ex, "Concurrency conflict while updating break type with ID {Id}", breakType.Id);
                throw new InvalidOperationException($"The break type with ID {breakType.Id} was modified by another user", ex);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating break type with ID {Id}", breakType.Id);
                throw;
            }
        }

        /// <inheritdoc />
        public async Task<bool> DeleteAsync(int id)
        {
            try
            {
                var breakType = await _dbContext.BreakTypes.FindAsync(id);
                if (breakType == null)
                {
                    return false;
                }

                // Use a transaction to ensure atomicity
                using var transaction = await _dbContext.Database.BeginTransactionAsync();
                try
                {
                    // Delete associated breaks directly with SQL for better performance
                    await _dbContext.Database.ExecuteSqlInterpolatedAsync(
                        $"DELETE FROM breaks WHERE break_type_id = {id}");

                    // Delete the break type
                    _dbContext.BreakTypes.Remove(breakType);
                    await _dbContext.SaveChangesAsync();

                    // Commit the transaction
                    await transaction.CommitAsync();
                    return true;
                }
                catch (Exception ex)
                {
                    // Rollback the transaction on error
                    await transaction.RollbackAsync();
                    _logger.LogError(ex, "Transaction failed while deleting break type with ID {Id}", id);
                    throw;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting break type with ID {Id}", id);
                throw;
            }
        }

        /// <inheritdoc />
        public async Task<bool> DeleteAsync(string userId, int id)
        {
            try
            {
                var breakType = await _dbContext.BreakTypes
                    .FirstOrDefaultAsync(bt => bt.UserId == userId && bt.Id == id);

                if (breakType == null)
                {
                    return false;
                }

                // Use a transaction to ensure atomicity
                using var transaction = await _dbContext.Database.BeginTransactionAsync();
                try
                {
                    // Delete associated breaks directly with SQL for better performance
                    await _dbContext.Database.ExecuteSqlInterpolatedAsync(
                        $"DELETE FROM breaks WHERE break_type_id = {id} AND user_id = {userId}");

                    // Delete the break type
                    _dbContext.BreakTypes.Remove(breakType);
                    await _dbContext.SaveChangesAsync();

                    // Commit the transaction
                    await transaction.CommitAsync();
                    return true;
                }
                catch (Exception ex)
                {
                    // Rollback the transaction on error
                    await transaction.RollbackAsync();
                    _logger.LogError(ex, "Transaction failed while deleting break type with ID {Id} for user {UserId}", id, userId);
                    throw;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting break type with ID {Id} for user {UserId}", id, userId);
                throw;
            }
        }

        /// <inheritdoc />
        public async Task<BreakType?> IncrementUsageCountAsync(int id)
        {
            try
            {
                var breakType = await _dbContext.BreakTypes.FindAsync(id);
                if (breakType == null)
                {
                    return null;
                }

                breakType.UsageCount++;
                breakType.UpdatedAt = DateTime.UtcNow;

                await _dbContext.SaveChangesAsync();
                return breakType;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error incrementing usage count for break type with ID {Id}", id);
                throw;
            }
        }

        /// <inheritdoc />

        public async Task<List<BreakType>> InitializeDefaultsAsync(string userId)
        {
            try
            {
                // Check if user already has break types
                var existingCount = await _dbContext.BreakTypes
                    .Where(bt => bt.UserId == userId)
                    .CountAsync();

                if (existingCount > 0)
                {
                    // User already has break types, return them
                    return await GetAllAsync(userId);
                }

                // Default JSON components string used for all break types
                string jsonString = "{\"widgets\":[{\"id\":\"widget-17417003489207-008\",\"type\":\"box\",\"position\":{\"x\":65,\"y\":50},\"size\":{\"width\":320,\"height\":320},\"zIndex\":1,\"properties\":{\"backgroundColor\":\"#ffffff\",\"borderRadius\":15}},{\"id\":\"widget-0041700289207-818\",\"type\":\"text\",\"position\":{\"x\":109.5,\"y\":146},\"size\":{\"width\":231,\"height\":114},\"zIndex\":2,\"properties\":{\"text\":\"{timer}\",\"fontFamily\":\"Arial\",\"fontSize\":72,\"fontColor\":\"#000000\",\"textAlign\":\"center\",\"hasPlaceholders\":true,\"showRawPlaceholders\":false}},{\"id\":\"widget-1741693003499-869\",\"position\":{\"x\":65,\"y\":68},\"size\":{\"width\":320,\"height\":68},\"zIndex\":3,\"type\":\"text\",\"properties\":{\"text\":\"{break-name}\",\"fontFamily\":\"Arial\",\"fontSize\":40,\"fontColor\":\"#333333\",\"textAlign\":\"center\",\"hasPlaceholders\":true,\"showRawPlaceholders\":false}},{\"id\":\"widget-1741693032103-445\",\"position\":{\"x\":65,\"y\":261},\"size\":{\"width\":320,\"height\":45},\"zIndex\":4,\"type\":\"text\",\"properties\":{\"text\":\"{time-unit}\",\"fontFamily\":\"Arial\",\"fontSize\":29,\"fontColor\":\"#333333\",\"textAlign\":\"center\",\"hasPlaceholders\":true,\"showRawPlaceholders\":false}},{\"id\":\"widget-1741693062657-689\",\"position\":{\"x\":65,\"y\":298},\"size\":{\"width\":320,\"height\":49},\"zIndex\":4,\"type\":\"text\",\"properties\":{\"text\":\"{countdown-message}\",\"fontFamily\":\"Arial\",\"fontSize\":29,\"fontColor\":\"#333333\",\"textAlign\":\"center\",\"hasPlaceholders\":true,\"showRawPlaceholders\":false}},{\"id\":\"widget-1741693222393-854\",\"position\":{\"x\":457.5,\"y\":50},\"size\":{\"width\":320,\"height\":320},\"zIndex\":1,\"type\":\"box\",\"properties\":{\"backgroundColor\":\"#ffffff\",\"borderRadius\":15}},{\"id\":\"widget-1741693222393-915\",\"position\":{\"x\":457.5,\"y\":68},\"size\":{\"width\":320,\"height\":68},\"zIndex\":3,\"type\":\"text\",\"properties\":{\"text\":\"Scan Me\",\"fontFamily\":\"Arial\",\"fontSize\":40,\"fontColor\":\"#333333\",\"textAlign\":\"center\",\"hasPlaceholders\":false,\"showRawPlaceholders\":false}},{\"id\":\"widget-1741693222393-5\",\"position\":{\"x\":457.5,\"y\":298},\"size\":{\"width\":320,\"height\":49},\"zIndex\":4,\"type\":\"text\",\"properties\":{\"text\":\"for a mobile timer\",\"fontFamily\":\"Arial\",\"fontSize\":29,\"fontColor\":\"#333333\",\"textAlign\":\"center\",\"hasPlaceholders\":false,\"showRawPlaceholders\":false}},{\"id\":\"widget-1741693229226-128\",\"position\":{\"x\":852,\"y\":50},\"size\":{\"width\":320,\"height\":320},\"zIndex\":1,\"type\":\"box\",\"properties\":{\"backgroundColor\":\"#ffffff\",\"borderRadius\":15}},{\"id\":\"widget-1741693229226-791\",\"position\":{\"x\":850,\"y\":192},\"size\":{\"width\":320,\"height\":45},\"zIndex\":4,\"type\":\"text\",\"properties\":{\"text\":\"{time-name-home}\",\"fontFamily\":\"Arial\",\"fontSize\":29,\"fontColor\":\"#333333\",\"textAlign\":\"center\",\"hasPlaceholders\":false,\"showRawPlaceholders\":false}},{\"id\":\"widget-1741693229226-897\",\"position\":{\"x\":850,\"y\":68},\"size\":{\"width\":320,\"height\":68},\"zIndex\":3,\"type\":\"text\",\"properties\":{\"text\":\"Break ends at\",\"fontFamily\":\"Arial\",\"fontSize\":40,\"fontColor\":\"#333333\",\"textAlign\":\"center\",\"hasPlaceholders\":false,\"showRawPlaceholders\":false}},{\"id\":\"widget-1741700068706-505\",\"position\":{\"x\":850,\"y\":136},\"size\":{\"width\":320,\"height\":55},\"zIndex\":68,\"type\":\"text\",\"properties\":{\"text\":\"{end-time-home}\",\"fontFamily\":\"Arial\",\"fontSize\":39,\"fontColor\":\"#333333\",\"textAlign\":\"center\",\"hasPlaceholders\":false,\"fontWeight\":\"bold\"}},{\"id\":\"widget-1741700106106-830\",\"position\":{\"x\":850,\"y\":246},\"size\":{\"width\":320,\"height\":55},\"zIndex\":68,\"type\":\"text\",\"properties\":{\"text\":\"{end-time-additional}\",\"fontFamily\":\"Arial\",\"fontSize\":39,\"fontColor\":\"#333333\",\"textAlign\":\"center\",\"hasPlaceholders\":false,\"fontWeight\":\"bold\"}},{\"id\":\"widget-1741700106106-491\",\"position\":{\"x\":850,\"y\":302},\"size\":{\"width\":320,\"height\":45},\"zIndex\":4,\"type\":\"text\",\"properties\":{\"text\":\"{time-name-additional}\",\"fontFamily\":\"Arial\",\"fontSize\":29,\"fontColor\":\"#333333\",\"textAlign\":\"center\",\"hasPlaceholders\":false,\"showRawPlaceholders\":false}},{\"id\":\"widget-1741700289207-888\",\"position\":{\"x\":540,\"y\":134},\"size\":{\"width\":155,\"height\":155},\"zIndex\":259,\"type\":\"qr\",\"properties\":{\"imageUrl\":\"img/general/dummy-qr.svg\"}}],\"nextZIndex\":420}";

                // Create default break types
                var defaultBreakTypes = new List<BreakType>
        {
            // 1. Short Break (from legacy code, was missing)
            new BreakType
            {
                UserId = userId,
                Name = "Short Break",
                DefaultDurationMinutes = 10,
                CountdownMessage = "until break ends.",
                CountdownEndMessage = "Break has ended.",
                EndTimeTitle = "Break ends at:",
                BreakTimeStepMinutes = 2,
                IconName = "fa-coffee",
                ImageTitle = "break",
                BackgroundImageChoices = "break;blueray",
                Components = jsonString,
                SortOrder = 1,
                IsLocked = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            },
            // 2. Coffee Break (update to match legacy properties)
            new BreakType
            {
                UserId = userId,
                Name = "Coffee Break",
                DefaultDurationMinutes = 15,
                CountdownMessage = "until break ends.",
                CountdownEndMessage = "Break has ended.",
                EndTimeTitle = "Break ends at:",
                BreakTimeStepMinutes = 5,
                IconName = "fa-mug-hot",
                ImageTitle = "coffee",
                BackgroundImageChoices = "coffee;blackboard",
                Components = jsonString,
                SortOrder = 2,
                IsLocked = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            },
            // 3. Lunch Break (update to match legacy properties)
            new BreakType
            {
                UserId = userId,
                Name = "Lunch Break",
                DefaultDurationMinutes = 30,
                CountdownMessage = "until break ends.",
                CountdownEndMessage = "Break has ended.",
                EndTimeTitle = "Break ends at:",
                BreakTimeStepMinutes = 10,
                IconName = "fa-utensils", // Changed from bx-bowl-hot to use Font Awesome
                ImageTitle = "lunch",
                BackgroundImageChoices = "lunch;cement",
                Components = jsonString,
                SortOrder = 3,
                IsLocked = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            },
            // 4. Lab Time (from legacy code, was missing)
            new BreakType
            {
                UserId = userId,
                Name = "Lab Time",
                DefaultDurationMinutes = 45,
                CountdownMessage = "until lab time ends.",
                CountdownEndMessage = "Lab time is over.",
                EndTimeTitle = "Lab time ends at:",
                BreakTimeStepMinutes = 15,
                IconName = "fa-flask",
                ImageTitle = "lab",
                BackgroundImageChoices = "lab;cool",
                Components = jsonString,
                SortOrder = 4,
                IsLocked = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            },
            // 5. Event Countdown (from legacy code, was missing)
            new BreakType
            {
                UserId = userId,
                Name = "Event Countdown",
                DefaultDurationMinutes = 120,
                CountdownMessage = "until event starts.",
                CountdownEndMessage = "The event will start soon.",
                EndTimeTitle = "Event will start at:",
                BreakTimeStepMinutes = 15,
                IconName = "fa-clock",
                ImageTitle = "event",
                BackgroundImageChoices = "event;modern",
                Components = jsonString,
                SortOrder = 5,
                IsLocked = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            }
        };

                _dbContext.BreakTypes.AddRange(defaultBreakTypes);
                await _dbContext.SaveChangesAsync();

                return defaultBreakTypes;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error initializing default break types for user {UserId}", userId);
                throw;
            }
        }



        /// <inheritdoc />
        public async Task DeleteAllForUserAsync(string userId)
        {
            try
            {
                // Use a transaction to ensure atomicity
                using var transaction = await _dbContext.Database.BeginTransactionAsync();
                try
                {
                    // Delete all breaks directly with SQL for better performance
                    int deletedBreaksCount = await _dbContext.Database.ExecuteSqlInterpolatedAsync(
                        $"DELETE FROM breaks WHERE user_id = {userId}");

                    // Delete all break types directly with SQL for better performance
                    int deletedBreakTypesCount = await _dbContext.Database.ExecuteSqlInterpolatedAsync(
                        $"DELETE FROM break_types WHERE user_id = {userId}");

                    // Commit the transaction
                    await transaction.CommitAsync();

                    _logger.LogInformation("Deleted {BreakCount} breaks and {BreakTypeCount} break types for user {UserId}",
                        deletedBreaksCount, deletedBreakTypesCount, userId);
                }
                catch (Exception ex)
                {
                    // Rollback the transaction on error
                    await transaction.RollbackAsync();
                    _logger.LogError(ex, "Transaction failed while deleting all break types for user {UserId}", userId);
                    throw;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting all break types for user {UserId}", userId);
                throw;
            }
        }
    }
}