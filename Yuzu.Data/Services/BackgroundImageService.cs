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
    /// Service implementation for managing background images
    /// </summary>
    public class BackgroundImageService : IBackgroundImageService
    {
        private readonly YuzuDbContext _dbContext;
        private readonly ILogger<BackgroundImageService> _logger;
        
        /// <summary>
        /// Initializes a new instance of the BackgroundImageService class
        /// </summary>
        /// <param name="dbContext">The database context</param>
        /// <param name="logger">The logger</param>
        public BackgroundImageService(YuzuDbContext dbContext, ILogger<BackgroundImageService> logger)
        {
            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }
        
        /// <inheritdoc />
        public async Task<List<BackgroundImage>> GetAllAsync()
        {
            try
            {
                var images = await _dbContext.BackgroundImages.ToListAsync();
                return images;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting all background images");
                throw;
            }
        }
        
        /// <inheritdoc />
        public async Task<List<BackgroundImage>> GetSystemImagesAsync()
        {
            try
            {
                var images = await _dbContext.BackgroundImages
                    .Where(bi => bi.IsSystem)
                    .ToListAsync();
                    
                return images;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting system background images");
                throw;
            }
        }
        
        /// <inheritdoc />
        public async Task<List<BackgroundImage>> GetByUserIdAsync(string userId)
        {
            try
            {
                var images = await _dbContext.BackgroundImages
                    .Where(bi => bi.UserId == userId)
                    .ToListAsync();
                    
                return images;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting background images for user {UserId}", userId);
                throw;
            }
        }
        
        /// <inheritdoc />
        public async Task<List<BackgroundImage>> GetUserImagesAsync(string userId)
        {
            try
            {
                var images = await _dbContext.BackgroundImages
                    .Where(bi => bi.UserId == userId && !bi.IsSystem)
                    .ToListAsync();
                    
                return images;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting user background images for user {UserId}", userId);
                throw;
            }
        }
        
        /// <inheritdoc />
        public async Task<List<BackgroundImage>> GetForUserWithSystemAsync(string userId)
        {
            try
            {
                var images = await _dbContext.BackgroundImages
                    .Where(bi => bi.IsSystem || bi.UserId == userId)
                    .ToListAsync();
                    
                return images;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting background images for user with system images {UserId}", userId);
                throw;
            }
        }
        
        /// <inheritdoc />
        public async Task<BackgroundImage> CreateAsync(BackgroundImage backgroundImage)
        {
            try
            {
                // Ensure UpdatedAt is set
                backgroundImage.UpdatedAt = DateTime.UtcNow;
                
                _dbContext.BackgroundImages.Add(backgroundImage);
                await _dbContext.SaveChangesAsync();
                return backgroundImage;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating background image {FileName}", backgroundImage.FileName);
                throw;
            }
        }
        
        /// <inheritdoc />
        public async Task<BackgroundImage> UpdateAsync(BackgroundImage backgroundImage)
        {
            try
            {
                var existingImage = await _dbContext.BackgroundImages.FindAsync(backgroundImage.Id);
                if (existingImage == null)
                {
                    throw new KeyNotFoundException($"Background image with ID {backgroundImage.Id} not found");
                }
                
                // Update properties
                existingImage.Title = backgroundImage.Title;
                existingImage.ThumbnailPath = backgroundImage.ThumbnailPath;
                existingImage.FullImagePath = backgroundImage.FullImagePath;
                existingImage.ThumbnailUrl = backgroundImage.ThumbnailUrl;
                existingImage.FullImageUrl = backgroundImage.FullImageUrl;
                existingImage.IsSystem = backgroundImage.IsSystem;
                existingImage.UpdatedAt = DateTime.UtcNow;
                
                await _dbContext.SaveChangesAsync();
                return existingImage;
            }
            catch (KeyNotFoundException)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating background image with ID {Id}", backgroundImage.Id);
                throw;
            }
        }
        
        /// <inheritdoc />
        public async Task<bool> DeleteAsync(int id)
        {
            try
            {
                var backgroundImage = await _dbContext.BackgroundImages.FindAsync(id);
                if (backgroundImage == null)
                {
                    return false;
                }
                
                _dbContext.BackgroundImages.Remove(backgroundImage);
                await _dbContext.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting background image with ID {Id}", id);
                throw;
            }
        }
        
        /// <inheritdoc />
        public async Task<bool> DeleteByFileNameAsync(string fileName)
        {
            try
            {
                var backgroundImage = await _dbContext.BackgroundImages
                    .Where(bi => bi.FileName == fileName)
                    .FirstOrDefaultAsync();
                    
                if (backgroundImage == null)
                {
                    return false;
                }
                
                _dbContext.BackgroundImages.Remove(backgroundImage);
                await _dbContext.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting background image {FileName}", fileName);
                throw;
            }
        }
        
        /// <inheritdoc />
        public async Task<bool> DeleteByFileNameAsync(string fileName, string userId)
        {
            try
            {
                var backgroundImage = await _dbContext.BackgroundImages
                    .Where(bi => bi.FileName == fileName && bi.UserId == userId)
                    .FirstOrDefaultAsync();
                    
                if (backgroundImage == null)
                {
                    return false;
                }
                
                _dbContext.BackgroundImages.Remove(backgroundImage);
                await _dbContext.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting background image {FileName} for user {UserId}", fileName, userId);
                throw;
            }
        }
        
        /// <inheritdoc />
        public async Task DeleteAllForUserAsync(string userId)
        {
            try
            {
                // Use direct SQL for better performance and to avoid loading entities into memory
                int deletedCount = await _dbContext.Database.ExecuteSqlInterpolatedAsync(
                    $"DELETE FROM background_images WHERE user_id = {userId} AND is_system = FALSE");
                
                _logger.LogInformation("Deleted {Count} background images for user {UserId}", deletedCount, userId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting all background images for user {UserId}", userId);
                throw;
            }
        }
        
        /// <inheritdoc />
        public async Task<BackgroundImage?> GetByIdAsync(int id)
        {
            try
            {
                return await _dbContext.BackgroundImages.FindAsync(id);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting background image with ID {Id}", id);
                throw;
            }
        }
        
        /// <inheritdoc />
        public async Task<BackgroundImage?> GetByFileNameAsync(string fileName)
        {
            try
            {
                return await _dbContext.BackgroundImages
                    .Where(bi => bi.FileName == fileName)
                    .FirstOrDefaultAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting background image with filename {FileName}", fileName);
                throw;
            }
        }
        
        // Helper method for updating URLs - not part of the interface
        public BackgroundImage UpdateUrls(BackgroundImage backgroundImage, string baseUrl)
        {
            if (string.IsNullOrEmpty(baseUrl))
            {
                return backgroundImage;
            }
            
            // Clean up the base URL
            if (!baseUrl.EndsWith('/'))
            {
                baseUrl += '/';
            }
            
            // Remove leading slash from paths if present
            var thumbnailPath = backgroundImage.ThumbnailPath.TrimStart('/');
            var fullImagePath = backgroundImage.FullImagePath.TrimStart('/');
            
            // Update URLs
            backgroundImage.ThumbnailUrl = $"{baseUrl}{thumbnailPath}";
            backgroundImage.FullImageUrl = $"{baseUrl}{fullImagePath}";
            
            return backgroundImage;
        }
    }
}