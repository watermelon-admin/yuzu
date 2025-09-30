using System.Collections.Generic;
using System.Threading.Tasks;
using Yuzu.Data.Models;

namespace Yuzu.Data.Services.Interfaces
{
    /// <summary>
    /// Service for managing breaks
    /// </summary>
    public interface IBreakService
    {
        /// <summary>
        /// Gets a specific break by ID
        /// </summary>
        /// <param name="userId">The user ID</param>
        /// <param name="breakId">The break ID (GUID)</param>
        /// <returns>The break, or null if not found</returns>
        Task<Break?> GetByIdAsync(string userId, string breakId);

        /// <summary>
        /// Gets a specific break by break ID only (no user ID required)
        /// </summary>
        /// <param name="breakId">The break ID (GUID)</param>
        /// <returns>The break, or null if not found</returns>
        Task<Break?> GetByBreakIdAsync(string breakId);
        
        /// <summary>
        /// Gets all breaks for a user
        /// </summary>
        /// <param name="userId">The user ID</param>
        /// <returns>A list of all breaks for the user</returns>
        Task<List<Break>> GetByUserIdAsync(string userId);
        
        /// <summary>
        /// Creates a new break
        /// </summary>
        /// <param name="breakEntity">The break to create</param>
        /// <returns>The created break</returns>
        Task<Break> CreateAsync(Break breakEntity);
        
        /// <summary>
        /// Updates an existing break
        /// </summary>
        /// <param name="breakEntity">The break to update</param>
        /// <returns>The updated break</returns>
        Task<Break> UpdateAsync(Break breakEntity);
        
        /// <summary>
        /// Deletes a break for a specific user
        /// </summary>
        /// <param name="userId">The user ID</param>
        /// <param name="breakId">The break ID (GUID)</param>
        /// <returns>True if deleted, false if not found</returns>
        Task<bool> DeleteAsync(string userId, string breakId);
        
        /// <summary>
        /// Deletes all breaks for a user
        /// </summary>
        /// <param name="userId">The user ID</param>
        /// <returns>A task representing the asynchronous operation</returns>
        Task DeleteAllForUserAsync(string userId);
    }
}