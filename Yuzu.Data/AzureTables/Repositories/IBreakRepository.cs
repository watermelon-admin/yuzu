using System.Collections.Generic;
using System.Threading.Tasks;
using Yuzu.Data.AzureTables.Entities;
using Yuzu.Data.Models;

namespace Yuzu.Data.AzureTables.Repositories
{
    public interface IBreakRepository
    {
        Task<BreakEntity?> GetAsync(string userId, string breakId);
        Task<BreakEntity?> GetByBreakIdAsync(string breakId);
        Task<IEnumerable<BreakEntity>> GetAllForUserAsync(string userId);
        Task<IEnumerable<BreakEntity>> GetByBreakTypeAsync(string userId, string breakTypeId);
        Task<BreakEntity> CreateAsync(string userId, Break breakData, string breakTypeName);
        Task<BreakEntity> UpdateAsync(string userId, string breakId, Break breakData);
        Task DeleteAsync(string userId, string breakId);
        Task DeleteAllForUserAsync(string userId);
        Task DeleteByBreakTypeAsync(string userId, string breakTypeId);
        Task InitializeAsync();
    }
}