using System.Collections.Generic;
using System.Threading.Tasks;
using Yuzu.Data.AzureTables.Entities;
using Yuzu.Data.Models;

namespace Yuzu.Data.AzureTables.Repositories
{
    public interface IBreakTypeRepository
    {
        Task<BreakTypeEntity?> GetAsync(string userId, string breakTypeId);
        Task<IEnumerable<BreakTypeEntity>> GetAllForUserAsync(string userId);
        Task<BreakTypeEntity> CreateAsync(string userId, BreakType breakType);
        Task<BreakTypeEntity> UpdateAsync(string userId, string breakTypeId, BreakType breakType);
        Task DeleteAsync(string userId, string breakTypeId);
        Task DeleteAllForUserAsync(string userId);
        Task<int> GetCountForUserAsync(string userId);
        Task InitializeAsync();
    }
}