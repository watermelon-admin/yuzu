using System.Collections.Generic;
using System.Threading.Tasks;
using Yuzu.Data.Models;

namespace Yuzu.Data.Services.Interfaces
{
    /// <summary>
    /// Service for managing user data
    /// </summary>
    public interface IUserDataService
    {
        /// <summary>
        /// Gets all user data items for a specific user
        /// </summary>
        /// <param name="userId">The user ID</param>
        /// <returns>A list of all user data items for the user</returns>
        Task<List<UserDataItem>> GetByUserIdAsync(string userId);
        
        /// <summary>
        /// Gets a specific user data item
        /// </summary>
        /// <param name="userId">The user ID</param>
        /// <param name="dataKey">The data key</param>
        /// <returns>The user data item, or null if not found</returns>
        Task<UserDataItem?> GetAsync(string userId, string dataKey);
        
        /// <summary>
        /// Creates a new user data item
        /// </summary>
        /// <param name="userDataItem">The user data item to create</param>
        /// <returns>The created user data item</returns>
        Task<UserDataItem> CreateAsync(UserDataItem userDataItem);
        
        /// <summary>
        /// Updates an existing user data item
        /// </summary>
        /// <param name="userDataItem">The user data item to update</param>
        /// <returns>The updated user data item</returns>
        Task<UserDataItem> UpdateAsync(UserDataItem userDataItem);
        
        /// <summary>
        /// Creates or updates a user data item
        /// </summary>
        /// <param name="userDataItem">The user data item to create or update</param>
        /// <returns>The created or updated user data item</returns>
        Task<UserDataItem> UpsertAsync(UserDataItem userDataItem);
        
        /// <summary>
        /// Deletes a user data item
        /// </summary>
        /// <param name="userId">The user ID</param>
        /// <param name="dataKey">The data key</param>
        /// <returns>True if deleted, false if not found</returns>
        Task<bool> DeleteAsync(string userId, string dataKey);
        
        /// <summary>
        /// Initializes default user data items for a user
        /// </summary>
        /// <param name="userId">The user ID</param>
        /// <param name="homeTimeZone">The user's home time zone in IANA format (e.g., 'America/New_York'). Defaults to UTC if not provided.</param>
        /// <returns>The created user data items</returns>
        Task<List<UserDataItem>> InitializeDefaultsAsync(string userId, string homeTimeZone = "UTC");
        
        /// <summary>
        /// Deletes all user data items for a user
        /// </summary>
        /// <param name="userId">The user ID</param>
        /// <returns>A task representing the asynchronous operation</returns>
        Task DeleteAllForUserAsync(string userId);
    }
}