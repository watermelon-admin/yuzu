using System.Collections.Generic;
using System.Threading.Tasks;
using Yuzu.Data.AzureTables.Entities;

namespace Yuzu.Data.AzureTables.Repositories
{
    public interface IUserDataRepository
    {
        Task<UserDataEntity?> GetAsync(string userId, string dataKey);
        Task<IEnumerable<UserDataEntity>> GetAllForUserAsync(string userId);
        Task<UserDataEntity> UpsertAsync(string userId, string dataKey, string value);
        Task DeleteAsync(string userId, string dataKey);
        Task DeleteAllForUserAsync(string userId);
        Task InitializeAsync();
    }
}