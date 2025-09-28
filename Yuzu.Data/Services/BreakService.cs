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
    /// Service implementation for managing breaks
    /// </summary>
    public class BreakService : IBreakService
    {
        private readonly IBreakRepository _breakRepository;
        private readonly IBreakTypeRepository _breakTypeRepository;
        private readonly ILogger<BreakService> _logger;

        /// <summary>
        /// Initializes a new instance of the BreakService class
        /// </summary>
        /// <param name="breakRepository">The break repository</param>
        /// <param name="breakTypeRepository">The break type repository</param>
        /// <param name="logger">The logger</param>
        public BreakService(IBreakRepository breakRepository, IBreakTypeRepository breakTypeRepository, ILogger<BreakService> logger)
        {
            _breakRepository = breakRepository ?? throw new ArgumentNullException(nameof(breakRepository));
            _breakTypeRepository = breakTypeRepository ?? throw new ArgumentNullException(nameof(breakTypeRepository));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }
        
        /// <inheritdoc />
        public async Task<Break?> GetByIdAsync(int id)
        {
            try
            {
                // This method needs userId to work with Azure Tables
                // Consider deprecating or requiring userId parameter
                _logger.LogWarning("GetByIdAsync called without userId - not supported with Azure Tables");
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting break with ID {Id}", id);
                throw new InvalidOperationException($"Failed to retrieve break with ID {id}. See inner exception for details.", ex);
            }
        }
        
        /// <inheritdoc />
        public async Task<List<Break>> GetByUserIdAsync(string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                throw new ArgumentException("User ID cannot be null or empty", nameof(userId));
            }

            try
            {
                var breakEntities = await _breakRepository.GetAllForUserAsync(userId);
                var breaks = new List<Break>();

                foreach (var entity in breakEntities)
                {
                    var breakModel = entity.ToBreak();

                    // Load the BreakType if available
                    if (!string.IsNullOrEmpty(entity.BreakTypeId))
                    {
                        var breakTypeEntity = await _breakTypeRepository.GetAsync(userId, entity.BreakTypeId);
                        if (breakTypeEntity != null)
                        {
                            breakModel.BreakType = breakTypeEntity.ToBreakType();
                        }
                    }

                    breaks.Add(breakModel);
                }

                _logger.LogInformation("Retrieved {Count} breaks for user {UserId}", breaks.Count, userId);
                return breaks;
            }
            catch (Exception ex) when (ex is not ArgumentException)
            {
                _logger.LogError(ex, "Error getting breaks for user {UserId}", userId);
                throw new InvalidOperationException($"Failed to retrieve breaks for user {userId}. See inner exception for details.", ex);
            }
        }
        
        /// <inheritdoc />
        public async Task<Break> CreateAsync(Break breakEntity)
        {
            if (breakEntity == null)
            {
                throw new ArgumentNullException(nameof(breakEntity));
            }

            if (string.IsNullOrEmpty(breakEntity.UserId))
            {
                throw new ArgumentException("Break must have a valid User ID", nameof(breakEntity));
            }

            try
            {
                // Ensure UpdatedAt is set properly
                breakEntity.UpdatedAt = DateTime.UtcNow;

                // Get break type name if BreakType is set
                string breakTypeName = "";
                if (breakEntity.BreakType != null)
                {
                    breakTypeName = breakEntity.BreakType.Name;
                }
                else if (breakEntity.BreakTypeId > 0)
                {
                    // Try to fetch break type name from repository
                    var breakTypeEntity = await _breakTypeRepository.GetAsync(breakEntity.UserId, breakEntity.BreakTypeId.ToString());
                    if (breakTypeEntity != null)
                    {
                        breakTypeName = breakTypeEntity.Name;
                        breakEntity.BreakType = breakTypeEntity.ToBreakType();
                    }
                }

                var createdEntity = await _breakRepository.CreateAsync(breakEntity.UserId, breakEntity, breakTypeName);
                var createdBreak = createdEntity.ToBreak();
                createdBreak.BreakType = breakEntity.BreakType;

                _logger.LogInformation("Created new break for user {UserId}", breakEntity.UserId);
                return createdBreak;
            }
            catch (Exception ex) when (ex is not ArgumentNullException && ex is not ArgumentException)
            {
                _logger.LogError(ex, "Error creating break for user {UserId}", breakEntity.UserId);
                throw new InvalidOperationException($"Failed to create break for user {breakEntity.UserId}. See inner exception for details.", ex);
            }
        }
        
        /// <inheritdoc />
        public async Task<Break> UpdateAsync(Break breakEntity)
        {
            if (breakEntity == null)
            {
                throw new ArgumentNullException(nameof(breakEntity));
            }

            if (string.IsNullOrEmpty(breakEntity.UserId))
            {
                throw new ArgumentException("Break must have a valid User ID for update", nameof(breakEntity));
            }

            try
            {
                // Set timestamp for tracking
                breakEntity.UpdatedAt = DateTime.UtcNow;

                var updatedEntity = await _breakRepository.UpdateAsync(breakEntity.UserId, breakEntity.Id.ToString(), breakEntity);
                var updatedBreak = updatedEntity.ToBreak();

                // Load the BreakType if needed
                if (breakEntity.BreakTypeId > 0 && breakEntity.BreakType == null)
                {
                    var breakTypeEntity = await _breakTypeRepository.GetAsync(breakEntity.UserId, breakEntity.BreakTypeId.ToString());
                    if (breakTypeEntity != null)
                    {
                        updatedBreak.BreakType = breakTypeEntity.ToBreakType();
                    }
                }
                else
                {
                    updatedBreak.BreakType = breakEntity.BreakType;
                }

                return updatedBreak;
            }
            catch (Exception ex) when (ex is not ArgumentNullException && ex is not ArgumentException)
            {
                _logger.LogError(ex, "Error updating break with ID {Id}", breakEntity.Id);
                throw new InvalidOperationException($"Failed to update break with ID {breakEntity.Id}. See inner exception for details.", ex);
            }
        }
        
        /// <inheritdoc />
        public async Task<bool> DeleteAsync(int id)
        {
            try
            {
                // This method needs userId to work with Azure Tables
                _logger.LogWarning("DeleteAsync called without userId - not supported with Azure Tables");
                return false;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting break with ID {Id}", id);
                throw new InvalidOperationException($"Failed to delete break with ID {id}. See inner exception for details.", ex);
            }
        }
        
        /// <inheritdoc />
        public async Task<bool> DeleteAsync(string userId, int id)
        {
            if (string.IsNullOrEmpty(userId))
            {
                throw new ArgumentException("User ID cannot be null or empty", nameof(userId));
            }

            try
            {
                await _breakRepository.DeleteAsync(userId, id.ToString());
                return true;
            }
            catch (Exception ex) when (ex is not ArgumentException)
            {
                _logger.LogError(ex, "Error deleting break with ID {Id} for user {UserId}", id, userId);
                // Return false if the break doesn't exist
                if (ex.Message.Contains("not found", StringComparison.OrdinalIgnoreCase))
                {
                    _logger.LogWarning("Attempted to delete non-existent break with ID {Id} for user {UserId}", id, userId);
                    return false;
                }
                throw new InvalidOperationException($"Failed to delete break with ID {id} for user {userId}. See inner exception for details.", ex);
            }
        }
        
        /// <inheritdoc />
        public async Task DeleteAllForUserAsync(string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                throw new ArgumentException("User ID cannot be null or empty", nameof(userId));
            }

            try
            {
                await _breakRepository.DeleteAllForUserAsync(userId);
                _logger.LogInformation("Deleted all breaks for user {UserId}", userId);
            }
            catch (Exception ex) when (ex is not ArgumentException)
            {
                _logger.LogError(ex, "Error deleting all breaks for user {UserId}", userId);
                throw new InvalidOperationException($"Failed to delete all breaks for user {userId}. See inner exception for details.", ex);
            }
        }
    }
}