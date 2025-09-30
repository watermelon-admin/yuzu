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
    public class BreakRepository : IBreakRepository
    {
        private readonly TableClient _tableClient;
        private readonly ILogger<BreakRepository> _logger;
        private const string TableName = "Breaks";

        public BreakRepository(IConfiguration configuration, ILogger<BreakRepository> logger)
        {
            _logger = logger;
            var connectionString = configuration.GetConnectionString("AzureStorage")
                ?? "UseDevelopmentStorage=true";

            var serviceClient = new TableServiceClient(connectionString);
            _tableClient = serviceClient.GetTableClient(TableName);
        }

        public async Task InitializeAsync()
        {
            await _tableClient.CreateIfNotExistsAsync();
        }

        public async Task<BreakEntity?> GetAsync(string userId, string breakId)
        {
            try
            {
                var response = await _tableClient.GetEntityAsync<BreakEntity>(breakId, "break");
                var entity = response.Value;

                // Verify the entity belongs to the requested user
                if (entity != null && entity.UserId != userId)
                {
                    _logger.LogWarning("Break {BreakId} does not belong to user {UserId}", breakId, userId);
                    return null;
                }

                return entity;
            }
            catch (RequestFailedException ex) when (ex.Status == 404)
            {
                return null;
            }
        }

        public async Task<BreakEntity?> GetByBreakIdAsync(string breakId)
        {
            try
            {
                // Direct lookup using partition key and constant row key - most efficient query
                var response = await _tableClient.GetEntityAsync<BreakEntity>(breakId, "break");
                return response.Value;
            }
            catch (RequestFailedException ex) when (ex.Status == 404)
            {
                return null;
            }
        }

        public async Task<IEnumerable<BreakEntity>> GetAllForUserAsync(string userId)
        {
            // Query by UserId property (cross-partition query)
            var query = _tableClient.QueryAsync<BreakEntity>(e => e.UserId == userId);
            var results = new List<BreakEntity>();

            await foreach (var entity in query)
            {
                results.Add(entity);
            }

            return results;
        }

        public async Task<IEnumerable<BreakEntity>> GetByBreakTypeAsync(string userId, string breakTypeId)
        {
            // Query by UserId property and filter by BreakTypeId (cross-partition query)
            var query = _tableClient.QueryAsync<BreakEntity>(e => e.UserId == userId);
            var results = new List<BreakEntity>();

            await foreach (var entity in query)
            {
                if (entity.BreakTypeId == breakTypeId)
                {
                    results.Add(entity);
                }
            }

            return results;
        }

        public async Task<BreakEntity> CreateAsync(string userId, Break breakData, string breakTypeName)
        {
            var breakId = Guid.NewGuid().ToString();

            var entity = new BreakEntity(breakId, userId)
            {
                UserId = userId,
                BreakTypeId = breakData.BreakTypeId.ToString(),
                BreakTypeName = breakTypeName, // Denormalized for display
                StartTime = breakData.StartTime,
                EndTime = breakData.EndTime,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _tableClient.AddEntityAsync(entity);

            // Set the GUID ID on the breakData object
            breakData.Id = breakId;

            return entity;
        }

        public async Task<BreakEntity> UpdateAsync(string userId, string breakId, Break breakData)
        {
            var existing = await GetAsync(userId, breakId);
            if (existing == null)
            {
                throw new InvalidOperationException($"Break not found: {userId}/{breakId}");
            }

            existing.StartTime = breakData.StartTime;
            existing.EndTime = breakData.EndTime;
            existing.UpdatedAt = DateTime.UtcNow;

            await _tableClient.UpdateEntityAsync(existing, existing.ETag, TableUpdateMode.Replace);
            return existing;
        }

        public async Task DeleteAsync(string userId, string breakId)
        {
            try
            {
                // Verify the break belongs to the user before deleting
                var existing = await GetAsync(userId, breakId);
                if (existing == null)
                {
                    _logger.LogDebug("Attempted to delete non-existent break or break not owned by user: {BreakId}/{UserId}", breakId, userId);
                    return;
                }

                await _tableClient.DeleteEntityAsync(breakId, "break");
            }
            catch (RequestFailedException ex) when (ex.Status == 404)
            {
                _logger.LogDebug("Attempted to delete non-existent break: {BreakId}/{UserId}", breakId, userId);
            }
        }

        public async Task DeleteAllForUserAsync(string userId)
        {
            // Query by UserId property to get all breaks for the user
            var query = _tableClient.QueryAsync<BreakEntity>(e => e.UserId == userId);

            // Note: Breaks are in different partitions, so we can't use batch transactions
            await foreach (var entity in query)
            {
                await _tableClient.DeleteEntityAsync(entity.PartitionKey, entity.RowKey);
            }
        }

        public async Task DeleteByBreakTypeAsync(string userId, string breakTypeId)
        {
            // Get all breaks for the break type and delete them
            var breaksToDelete = await GetByBreakTypeAsync(userId, breakTypeId);

            // Note: With the new structure, breaks are in different partitions
            // We cannot use batch transactions as they require same partition key
            foreach (var breakEntity in breaksToDelete)
            {
                await _tableClient.DeleteEntityAsync(breakEntity.PartitionKey, breakEntity.RowKey);
            }
        }
    }
}