using Azure;
using Azure.Data.Tables;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Yuzu.Data.AzureTables.Entities;
using Yuzu.Data.Models;

namespace Yuzu.Data.AzureTables.Repositories
{
    public class BreakTypeRepository : IBreakTypeRepository
    {
        private readonly TableClient _tableClient;
        private readonly ILogger<BreakTypeRepository> _logger;
        private const string TableName = "BreakTypes";

        public BreakTypeRepository(TableServiceClientFactory factory, ILogger<BreakTypeRepository> logger)
        {
            _logger = logger;
            _tableClient = factory.GetTableClient(TableName);
        }

        public async Task InitializeAsync()
        {
            await _tableClient.CreateIfNotExistsAsync();
        }

        public async Task<BreakTypeEntity?> GetAsync(string userId, string breakTypeId)
        {
            try
            {
                var response = await _tableClient.GetEntityAsync<BreakTypeEntity>(userId, breakTypeId);
                return response.Value;
            }
            catch (RequestFailedException ex) when (ex.Status == 404)
            {
                return null;
            }
        }

        public async Task<IEnumerable<BreakTypeEntity>> GetAllForUserAsync(string userId)
        {
            var query = _tableClient.QueryAsync<BreakTypeEntity>(e => e.PartitionKey == userId);
            var results = new List<BreakTypeEntity>();

            await foreach (var entity in query)
            {
                results.Add(entity);
            }

            // Sort by SortOrder on client side (Azure Tables doesn't support ORDER BY)
            return results.OrderBy(bt => bt.SortOrder);
        }

        public async Task<BreakTypeEntity> CreateAsync(string userId, BreakType breakType)
        {
            var breakTypeId = Guid.NewGuid().ToString();

            var entity = new BreakTypeEntity(userId, breakTypeId)
            {
                Name = breakType.Name,
                DefaultDurationMinutes = breakType.DefaultDurationMinutes,
                CountdownMessage = breakType.CountdownMessage,
                CountdownEndMessage = breakType.CountdownEndMessage,
                EndTimeTitle = breakType.EndTimeTitle,
                BreakTimeStepMinutes = breakType.BreakTimeStepMinutes,
                BackgroundImageChoices = breakType.BackgroundImageChoices,
                ImageTitle = breakType.ImageTitle,
                UsageCount = breakType.UsageCount,
                IconName = breakType.IconName,
                Components = breakType.Components,
                IsLocked = breakType.IsLocked,
                SortOrder = breakType.SortOrder,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _tableClient.AddEntityAsync(entity);
            return entity;
        }

        public async Task<BreakTypeEntity> UpdateAsync(string userId, string breakTypeId, BreakType breakType)
        {
            var existing = await GetAsync(userId, breakTypeId);
            if (existing == null)
            {
                throw new InvalidOperationException($"Break type not found: {userId}/{breakTypeId}");
            }

            existing.Name = breakType.Name;
            existing.DefaultDurationMinutes = breakType.DefaultDurationMinutes;
            existing.CountdownMessage = breakType.CountdownMessage;
            existing.CountdownEndMessage = breakType.CountdownEndMessage;
            existing.EndTimeTitle = breakType.EndTimeTitle;
            existing.BreakTimeStepMinutes = breakType.BreakTimeStepMinutes;
            existing.BackgroundImageChoices = breakType.BackgroundImageChoices;
            existing.ImageTitle = breakType.ImageTitle;
            existing.UsageCount = breakType.UsageCount;
            existing.IconName = breakType.IconName;
            existing.Components = breakType.Components;
            existing.ThumbnailUrl = breakType.ThumbnailUrl;
            existing.ThumbnailPath = breakType.ThumbnailPath;
            existing.IsLocked = breakType.IsLocked;
            existing.SortOrder = breakType.SortOrder;
            existing.UpdatedAt = DateTime.UtcNow;

            await _tableClient.UpdateEntityAsync(existing, existing.ETag, TableUpdateMode.Replace);
            return existing;
        }

        public async Task DeleteAsync(string userId, string breakTypeId)
        {
            try
            {
                await _tableClient.DeleteEntityAsync(userId, breakTypeId);
            }
            catch (RequestFailedException ex) when (ex.Status == 404)
            {
                _logger.LogDebug("Attempted to delete non-existent break type: {UserId}/{BreakTypeId}", userId, breakTypeId);
            }
        }

        public async Task DeleteAllForUserAsync(string userId)
        {
            var query = _tableClient.QueryAsync<BreakTypeEntity>(e => e.PartitionKey == userId);
            var batchTransactions = new List<TableTransactionAction>();

            await foreach (var entity in query)
            {
                batchTransactions.Add(new TableTransactionAction(TableTransactionActionType.Delete, entity));

                if (batchTransactions.Count >= 100)
                {
                    await _tableClient.SubmitTransactionAsync(batchTransactions);
                    batchTransactions.Clear();
                }
            }

            if (batchTransactions.Any())
            {
                await _tableClient.SubmitTransactionAsync(batchTransactions);
            }
        }

        public async Task<int> GetCountForUserAsync(string userId)
        {
            var query = _tableClient.QueryAsync<BreakTypeEntity>(e => e.PartitionKey == userId, select: new[] { "RowKey" });
            var count = 0;

            await foreach (var _ in query)
            {
                count++;
            }

            return count;
        }
    }
}