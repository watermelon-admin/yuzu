using System.Threading.Tasks;

namespace Yuzu.Data.Services.Interfaces
{
    /// <summary>
    /// Service for cleaning up user data
    /// </summary>
    public interface IUserDataCleanupService
    {
        /// <summary>
        /// Deletes all data for a user
        /// </summary>
        /// <param name="userId">The user ID</param>
        /// <returns>A task representing the asynchronous operation</returns>
        Task DeleteAllUserDataAsync(string userId);
    }
}