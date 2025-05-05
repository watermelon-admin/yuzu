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
    /// Service implementation for managing breaks
    /// </summary>
    public class BreakService : IBreakService
    {
        private readonly YuzuDbContext _dbContext;
        private readonly ILogger<BreakService> _logger;
        
        /// <summary>
        /// Initializes a new instance of the BreakService class
        /// </summary>
        /// <param name="dbContext">The database context</param>
        /// <param name="logger">The logger</param>
        public BreakService(YuzuDbContext dbContext, ILogger<BreakService> logger)
        {
            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }
        
        /// <inheritdoc />
        public async Task<Break?> GetByIdAsync(int id)
        {
            try
            {
                var breakEntity = await _dbContext.Breaks
                    .Include(b => b.BreakType)
                    .FirstOrDefaultAsync(b => b.Id == id);
                    
                if (breakEntity == null)
                {
                    _logger.LogInformation("Break with ID {Id} not found", id);
                }
                
                return breakEntity;
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
                var breaks = await _dbContext.Breaks
                    .Include(b => b.BreakType)
                    .Where(b => b.UserId == userId)
                    .ToListAsync();
                    
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
                
                _dbContext.Breaks.Add(breakEntity);
                await _dbContext.SaveChangesAsync();
                
                // Refresh the entity to include the break type
                if (breakEntity.Id > 0)
                {
                    await _dbContext.Entry(breakEntity)
                        .Reference(b => b.BreakType)
                        .LoadAsync();
                }
                
                _logger.LogInformation("Created new break with ID {Id} for user {UserId}", breakEntity.Id, breakEntity.UserId);
                return breakEntity;
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(ex, "Database error while creating break for user {UserId}", breakEntity.UserId);
                throw new InvalidOperationException($"Failed to create break for user {breakEntity.UserId}. Database error occurred.", ex);
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

            try
            {
                // First check if entity exists
                bool exists = await _dbContext.Breaks.AnyAsync(b => b.Id == breakEntity.Id);
                if (!exists)
                {
                    _logger.LogWarning("Attempted to update non-existent break with ID {Id}", breakEntity.Id);
                    throw new KeyNotFoundException($"Break with ID {breakEntity.Id} not found");
                }
                
                // Set timestamp for tracking
                breakEntity.UpdatedAt = DateTime.UtcNow;
                
                // Use entity tracking to efficiently update only changed fields
                _dbContext.Entry(breakEntity).State = EntityState.Modified;
                
                // Always preserve the original UserId and CreatedAt
                _dbContext.Entry(breakEntity).Property(b => b.UserId).IsModified = false;
                _dbContext.Entry(breakEntity).Property(b => b.CreatedAt).IsModified = false;
                
                await _dbContext.SaveChangesAsync();
                
                // Refresh the entity to include the break type if it's referenced
                if (breakEntity.BreakType == null)
                {
                    await _dbContext.Entry(breakEntity)
                        .Reference(b => b.BreakType)
                        .LoadAsync();
                }
                
                return breakEntity;
            }
            catch (DbUpdateConcurrencyException ex)
            {
                _logger.LogError(ex, "Concurrency conflict while updating break with ID {Id}", breakEntity.Id);
                throw new InvalidOperationException($"The break with ID {breakEntity.Id} was modified by another user", ex);
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(ex, "Database error while updating break with ID {Id}", breakEntity.Id);
                throw new InvalidOperationException($"Failed to update break with ID {breakEntity.Id}. Database error occurred.", ex);
            }
            catch (Exception ex) when (ex is not KeyNotFoundException && ex is not ArgumentNullException)
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
                var breakEntity = await _dbContext.Breaks.FindAsync(id);
                if (breakEntity == null)
                {
                    _logger.LogWarning("Attempted to delete non-existent break with ID {Id}", id);
                    return false;
                }
                
                _dbContext.Breaks.Remove(breakEntity);
                await _dbContext.SaveChangesAsync();
                return true;
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(ex, "Database error while deleting break with ID {Id}", id);
                throw new InvalidOperationException($"Failed to delete break with ID {id}. Database error occurred.", ex);
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
                var breakEntity = await _dbContext.Breaks
                    .FirstOrDefaultAsync(b => b.UserId == userId && b.Id == id);
                
                if (breakEntity == null)
                {
                    _logger.LogWarning("Attempted to delete non-existent break with ID {Id} for user {UserId}", id, userId);
                    return false;
                }
                
                _dbContext.Breaks.Remove(breakEntity);
                await _dbContext.SaveChangesAsync();
                return true;
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(ex, "Database error while deleting break with ID {Id} for user {UserId}", id, userId);
                throw new InvalidOperationException($"Failed to delete break with ID {id}. Database error occurred.", ex);
            }
            catch (Exception ex) when (ex is not ArgumentException)
            {
                _logger.LogError(ex, "Error deleting break with ID {Id} for user {UserId}", id, userId);
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
                // Use direct SQL for better performance
                int deletedCount = await _dbContext.Database.ExecuteSqlInterpolatedAsync(
                    $"DELETE FROM breaks WHERE user_id = {userId}");
                
                _logger.LogInformation("Deleted {Count} breaks for user {UserId}", deletedCount, userId);
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(ex, "Database error while deleting all breaks for user {UserId}", userId);
                throw new InvalidOperationException($"Failed to delete breaks for user {userId}. Database error occurred.", ex);
            }
            catch (Exception ex) when (ex is not ArgumentException)
            {
                _logger.LogError(ex, "Error deleting all breaks for user {UserId}", userId);
                throw new InvalidOperationException($"Failed to delete all breaks for user {userId}. See inner exception for details.", ex);
            }
        }
    }
}