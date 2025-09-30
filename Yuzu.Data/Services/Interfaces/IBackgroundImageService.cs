using System.Collections.Generic;
using System.Threading.Tasks;
using Yuzu.Data.Models;

namespace Yuzu.Data.Services.Interfaces
{
    /// <summary>
    /// Service for managing background images
    /// </summary>
    public interface IBackgroundImageService
    {
        /// <summary>
        /// Gets all system background images
        /// </summary>
        /// <returns>A list of all system background images</returns>
        Task<List<BackgroundImage>> GetSystemImagesAsync();
        
        /// <summary>
        /// Gets all background images for a user
        /// </summary>
        /// <param name="userId">The user ID</param>
        /// <returns>A list of all background images for the user</returns>
        Task<List<BackgroundImage>> GetByUserIdAsync(string userId);
        
        /// <summary>
        /// Gets all background images for a user
        /// </summary>
        /// <param name="userId">The user ID</param>
        /// <returns>A list of all background images for the user</returns>
        Task<List<BackgroundImage>> GetUserImagesAsync(string userId);
        
        /// <summary>
        /// Gets all background images for a user, including system images
        /// </summary>
        /// <param name="userId">The user ID</param>
        /// <returns>A list of all background images for the user, including system images</returns>
        Task<List<BackgroundImage>> GetForUserWithSystemAsync(string userId);
        
        /// <summary>
        /// Creates a new background image
        /// </summary>
        /// <param name="backgroundImage">The background image to create</param>
        /// <returns>The created background image</returns>
        Task<BackgroundImage> CreateAsync(BackgroundImage backgroundImage);
        
        /// <summary>
        /// Updates an existing background image
        /// </summary>
        /// <param name="backgroundImage">The background image to update</param>
        /// <returns>The updated background image</returns>
        Task<BackgroundImage> UpdateAsync(BackgroundImage backgroundImage);
        
        /// <summary>
        /// Deletes a background image by file name for a specific user
        /// </summary>
        /// <param name="fileName">The file name</param>
        /// <param name="userId">The user ID</param>
        /// <returns>True if deleted, false if not found</returns>
        Task<bool> DeleteByFileNameAsync(string fileName, string userId);
        
        /// <summary>
        /// Deletes all background images for a user
        /// </summary>
        /// <param name="userId">The user ID</param>
        /// <returns>A task representing the asynchronous operation</returns>
        Task DeleteAllForUserAsync(string userId);
    }
}