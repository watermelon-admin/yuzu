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
    /// Service implementation for managing background images
    /// </summary>
    public class BackgroundImageService : IBackgroundImageService
    {
        private readonly IBackgroundImageRepository _repository;
        private readonly ILogger<BackgroundImageService> _logger;

        /// <summary>
        /// Initializes a new instance of the BackgroundImageService class
        /// </summary>
        /// <param name="repository">The background image repository</param>
        /// <param name="logger">The logger</param>
        public BackgroundImageService(IBackgroundImageRepository repository, ILogger<BackgroundImageService> logger)
        {
            _repository = repository ?? throw new ArgumentNullException(nameof(repository));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }
        
        /// <inheritdoc />
        public async Task<List<BackgroundImage>> GetAllAsync()
        {
            try
            {
                // Note: This method might need revision as Azure Tables requires a partition key
                // For now, returning empty list as getting ALL images across all users is not typical
                _logger.LogWarning("GetAllAsync called - this operation is not optimal for Azure Tables");
                return new List<BackgroundImage>();
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
                var entities = await _repository.GetSystemImagesAsync();
                return entities.Select(e => e.ToBackgroundImage()).ToList();
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
                var entities = await _repository.GetUserImagesAsync(userId);
                return entities.Select(e => e.ToBackgroundImage()).ToList();
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
                var entities = await _repository.GetUserImagesAsync(userId);
                // Filter out system images
                return entities.Where(e => !e.IsSystem).Select(e => e.ToBackgroundImage()).ToList();
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
                var entities = await _repository.GetAllForUserAsync(userId);
                return entities.Select(e => e.ToBackgroundImage()).ToList();
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

                var entity = await _repository.CreateAsync(backgroundImage);
                return entity.ToBackgroundImage();
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
                // For Azure Tables, we need partition key (userId or "system") and row key (image id)
                // Since BackgroundImage has UserId, we can determine the partition key
                string partitionKey = backgroundImage.IsSystem ? "system" : backgroundImage.UserId;
                string imageId = backgroundImage.Id.ToString();

                backgroundImage.UpdatedAt = DateTime.UtcNow;
                var entity = await _repository.UpdateAsync(partitionKey, imageId, backgroundImage);
                return entity.ToBackgroundImage();
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
                // Without knowing the partition key, we cannot delete directly
                // This method might need refactoring to include userId/partitionKey
                _logger.LogWarning("DeleteAsync(int) called - needs partition key for Azure Tables");
                return false;
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
                // Without knowing the partition key, we cannot delete directly
                // This method might need refactoring to include userId/partitionKey
                _logger.LogWarning("DeleteByFileNameAsync called without userId - needs partition key for Azure Tables");
                return false;
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
                // Get user images and find the one with matching fileName
                var entities = await _repository.GetUserImagesAsync(userId);
                var imageToDelete = entities.FirstOrDefault(e => e.FileName == fileName);

                if (imageToDelete == null)
                {
                    return false;
                }

                await _repository.DeleteAsync(userId, imageToDelete.RowKey);
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
                await _repository.DeleteUserImagesAsync(userId);
                _logger.LogInformation("Deleted all background images for user {UserId}", userId);
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
                // Without knowing the partition key, we cannot get directly
                // This method might need refactoring to include userId/partitionKey
                _logger.LogWarning("GetByIdAsync called without userId - needs partition key for Azure Tables");
                return null;
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
                // Without knowing the partition key, we cannot query directly
                // This method might need refactoring to include userId/partitionKey
                _logger.LogWarning("GetByFileNameAsync called without userId - needs partition key for Azure Tables");
                return null;
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