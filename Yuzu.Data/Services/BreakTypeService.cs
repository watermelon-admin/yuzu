using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Yuzu.Data.Models;
using Yuzu.Data.Services.Interfaces;
using Yuzu.Data.AzureTables.Repositories;
using Yuzu.Data.AzureTables.Entities;

namespace Yuzu.Data.Services
{
    /// <summary>
    /// Service implementation for managing break types
    /// </summary>
    public class BreakTypeService : IBreakTypeService
    {
        private readonly IBreakTypeRepository _repository;
        private readonly IBreakRepository _breakRepository;
        private readonly ILogger<BreakTypeService> _logger;

        /// <summary>
        /// Initializes a new instance of the BreakTypeService class
        /// </summary>
        /// <param name="repository">The break type repository</param>
        /// <param name="breakRepository">The break repository</param>
        /// <param name="logger">The logger</param>
        public BreakTypeService(IBreakTypeRepository repository, IBreakRepository breakRepository, ILogger<BreakTypeService> logger)
        {
            _repository = repository ?? throw new ArgumentNullException(nameof(repository));
            _breakRepository = breakRepository ?? throw new ArgumentNullException(nameof(breakRepository));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <inheritdoc />
        public async Task<List<BreakType>> GetAllAsync(string userId)
        {
            try
            {
                var entities = await _repository.GetAllForUserAsync(userId);
                return entities
                    .Select(e => e.ToBreakType())
                    .OrderBy(bt => bt.SortOrder)
                    .ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting all break types for user {UserId}", userId);
                throw;
            }
        }

        /// <inheritdoc />
        public async Task<BreakType?> GetByIdAsync(string breakTypeId)
        {
            try
            {
                // This method needs userId to work with Azure Tables
                _logger.LogWarning("GetByIdAsync called without userId - not supported with Azure Tables");
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting break type with ID {Id}", breakTypeId);
                throw;
            }
        }

        /// <inheritdoc />
        public async Task<BreakType?> GetAsync(string userId, string breakTypeId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                throw new ArgumentException("User ID cannot be null or empty", nameof(userId));
            }

            if (string.IsNullOrEmpty(breakTypeId))
            {
                throw new ArgumentException("Break type ID cannot be null or empty", nameof(breakTypeId));
            }

            try
            {
                var entity = await _repository.GetAsync(userId, breakTypeId);
                if (entity == null)
                {
                    _logger.LogInformation("Break type with ID {Id} not found for user {UserId}", breakTypeId, userId);
                    return null;
                }

                return entity.ToBreakType();
            }
            catch (Exception ex) when (ex is not ArgumentException)
            {
                _logger.LogError(ex, "Error getting break type with ID {Id} for user {UserId}", breakTypeId, userId);
                throw new InvalidOperationException($"Failed to retrieve break type with ID {breakTypeId} for user {userId}. See inner exception for details.", ex);
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

                var entity = await _repository.CreateAsync(breakType.UserId, breakType);
                var created = entity.ToBreakType();

                _logger.LogInformation("Created new break type for user {UserId}", breakType.UserId);
                return created;
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
            if (breakType == null)
            {
                throw new ArgumentNullException(nameof(breakType));
            }

            if (string.IsNullOrEmpty(breakType.UserId))
            {
                throw new ArgumentException("Break type must have a valid User ID for update", nameof(breakType));
            }

            try
            {
                // Set timestamp for tracking
                breakType.UpdatedAt = DateTime.UtcNow;

                var entity = await _repository.UpdateAsync(breakType.UserId, breakType.Id, breakType);
                return entity.ToBreakType();
            }
            catch (Exception ex) when (ex is not ArgumentNullException && ex is not ArgumentException)
            {
                if (ex.Message.Contains("not found", StringComparison.OrdinalIgnoreCase))
                {
                    throw new KeyNotFoundException($"Break type with ID {breakType.Id} not found");
                }
                _logger.LogError(ex, "Error updating break type with ID {Id}", breakType.Id);
                throw;
            }
        }

        /// <inheritdoc />
        public async Task<bool> DeleteAsync(string breakTypeId)
        {
            try
            {
                // This method needs userId to work with Azure Tables
                _logger.LogWarning("DeleteAsync called without userId - not supported with Azure Tables");
                return false;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting break type with ID {Id}", breakTypeId);
                throw;
            }
        }

        /// <inheritdoc />
        public async Task<bool> DeleteAsync(string userId, string breakTypeId)
        {
            try
            {
                // First delete all associated breaks
                await _breakRepository.DeleteByBreakTypeAsync(userId, breakTypeId);

                // Then delete the break type
                await _repository.DeleteAsync(userId, breakTypeId);
                return true;
            }
            catch (Exception ex)
            {
                if (ex.Message.Contains("not found", StringComparison.OrdinalIgnoreCase))
                {
                    return false;
                }
                _logger.LogError(ex, "Error deleting break type with ID {Id} for user {UserId}", breakTypeId, userId);
                throw;
            }
        }

        /// <inheritdoc />
        public async Task<BreakType?> IncrementUsageCountAsync(string breakTypeId)
        {
            try
            {
                // This method needs userId to work with Azure Tables
                // Consider requiring userId parameter or deprecating this method
                _logger.LogWarning("IncrementUsageCountAsync called without userId - not supported with Azure Tables");
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error incrementing usage count for break type with ID {Id}", breakTypeId);
                throw;
            }
        }

        /// <inheritdoc />

        public async Task<List<BreakType>> InitializeDefaultsAsync(string userId)
        {
            try
            {
                // Check if user already has break types
                var existingCount = await _repository.GetCountForUserAsync(userId);

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

                // Create default break types one by one
                var createdBreakTypes = new List<BreakType>();
                foreach (var breakType in defaultBreakTypes)
                {
                    var entity = await _repository.CreateAsync(userId, breakType);
                    createdBreakTypes.Add(entity.ToBreakType());
                }

                return createdBreakTypes;
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
                // Delete all breaks first
                await _breakRepository.DeleteAllForUserAsync(userId);

                // Then delete all break types
                await _repository.DeleteAllForUserAsync(userId);

                _logger.LogInformation("Deleted all breaks and break types for user {UserId}", userId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting all break types for user {UserId}", userId);
                throw;
            }
        }
    }
}