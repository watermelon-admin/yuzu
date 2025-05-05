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
        /// <param name="id">The break ID</param>
        /// <returns>The break, or null if not found</returns>
        Task<Break?> GetByIdAsync(int id);
        
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
        /// Deletes a break
        /// </summary>
        /// <param name="id">The break ID</param>
        /// <returns>True if deleted, false if not found</returns>
        Task<bool> DeleteAsync(int id);
        
        /// <summary>
        /// Deletes a break for a specific user
        /// </summary>
        /// <param name="userId">The user ID</param>
        /// <param name="id">The break ID</param>
        /// <returns>True if deleted, false if not found</returns>
        Task<bool> DeleteAsync(string userId, int id);
        
        /// <summary>
        /// Deletes all breaks for a user
        /// </summary>
        /// <param name="userId">The user ID</param>
        /// <returns>A task representing the asynchronous operation</returns>
        Task DeleteAllForUserAsync(string userId);
    }
}