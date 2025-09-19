using System.Collections.Generic;
using System.Threading.Tasks;
using Yuzu.Data.AzureTables.Entities;
using Yuzu.Data.Models;

namespace Yuzu.Data.AzureTables.Repositories
{
    public interface IBackgroundImageRepository
    {
        Task<BackgroundImageEntity?> GetAsync(string partitionKey, string imageId);
        Task<IEnumerable<BackgroundImageEntity>> GetUserImagesAsync(string userId);
        Task<IEnumerable<BackgroundImageEntity>> GetSystemImagesAsync();
        Task<IEnumerable<BackgroundImageEntity>> GetAllForUserAsync(string userId);
        Task<BackgroundImageEntity> CreateAsync(BackgroundImage image);
        Task<BackgroundImageEntity> UpdateAsync(string partitionKey, string imageId, BackgroundImage image);
        Task DeleteAsync(string partitionKey, string imageId);
        Task DeleteUserImagesAsync(string userId);
        Task InitializeAsync();
    }
}