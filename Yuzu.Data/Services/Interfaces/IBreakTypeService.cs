using System.Collections.Generic;
using System.Threading.Tasks;
using Yuzu.Data.Models;

namespace Yuzu.Data.Services.Interfaces
{
    /// <summary>
    /// Service for managing break types
    /// </summary>
    public interface IBreakTypeService
    {
        /// <summary>
        /// Gets all break types for a user
        /// </summary>
        /// <param name="userId">The user ID</param>
        /// <returns>A list of all break types for the user</returns>
        Task<List<BreakType>> GetAllAsync(string userId);
        
        /// <summary>
        /// Gets a specific break type by ID
        /// </summary>
        /// <param name="breakTypeId">The break type ID (GUID)</param>
        /// <returns>The break type, or null if not found</returns>
        Task<BreakType?> GetByIdAsync(string breakTypeId);
        
        /// <summary>
        /// Gets a specific break type for a user
        /// </summary>
        /// <param name="userId">The user ID</param>
        /// <param name="breakTypeId">The break type ID (GUID)</param>
        /// <returns>The break type, or null if not found</returns>
        Task<BreakType?> GetAsync(string userId, string breakTypeId);
        
        /// <summary>
        /// Creates a new break type
        /// </summary>
        /// <param name="breakType">The break type to create</param>
        /// <returns>The created break type</returns>
        Task<BreakType> CreateAsync(BreakType breakType);
        
        /// <summary>
        /// Updates an existing break type
        /// </summary>
        /// <param name="breakType">The break type to update</param>
        /// <returns>The updated break type</returns>
        Task<BreakType> UpdateAsync(BreakType breakType);
        
        /// <summary>
        /// Deletes a break type
        /// </summary>
        /// <param name="breakTypeId">The break type ID (GUID)</param>
        /// <returns>True if deleted, false if not found</returns>
        Task<bool> DeleteAsync(string breakTypeId);
        
        /// <summary>
        /// Deletes a break type for a specific user
        /// </summary>
        /// <param name="userId">The user ID</param>
        /// <param name="breakTypeId">The break type ID (GUID)</param>
        /// <returns>True if deleted, false if not found</returns>
        Task<bool> DeleteAsync(string userId, string breakTypeId);
        
        /// <summary>
        /// Increments the usage count for a break type
        /// </summary>
        /// <param name="breakTypeId">The break type ID (GUID)</param>
        /// <returns>The updated break type</returns>
        Task<BreakType?> IncrementUsageCountAsync(string breakTypeId);
        
        /// <summary>
        /// Initializes default break types for a user
        /// </summary>
        /// <param name="userId">The user ID</param>
        /// <returns>The created break types</returns>
        Task<List<BreakType>> InitializeDefaultsAsync(string userId);
        
        /// <summary>
        /// Deletes all break types for a user
        /// </summary>
        /// <param name="userId">The user ID</param>
        /// <returns>A task representing the asynchronous operation</returns>
        Task DeleteAllForUserAsync(string userId);
    }
}