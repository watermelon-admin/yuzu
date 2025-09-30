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
                var response = await _tableClient.GetEntityAsync<BreakEntity>(userId, breakId);
                return response.Value;
            }
            catch (RequestFailedException ex) when (ex.Status == 404)
            {
                return null;
            }
        }

        public async Task<IEnumerable<BreakEntity>> GetAllForUserAsync(string userId)
        {
            var query = _tableClient.QueryAsync<BreakEntity>(e => e.PartitionKey == userId);
            var results = new List<BreakEntity>();

            await foreach (var entity in query)
            {
                results.Add(entity);
            }

            return results;
        }

        public async Task<IEnumerable<BreakEntity>> GetByBreakTypeAsync(string userId, string breakTypeId)
        {
            // This requires scanning the partition and filtering by BreakTypeId
            var query = _tableClient.QueryAsync<BreakEntity>(e => e.PartitionKey == userId);
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

            var entity = new BreakEntity(userId, breakId)
            {
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
                await _tableClient.DeleteEntityAsync(userId, breakId);
            }
            catch (RequestFailedException ex) when (ex.Status == 404)
            {
                _logger.LogDebug("Attempted to delete non-existent break: {UserId}/{BreakId}", userId, breakId);
            }
        }

        public async Task DeleteAllForUserAsync(string userId)
        {
            var query = _tableClient.QueryAsync<BreakEntity>(e => e.PartitionKey == userId);
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

        public async Task DeleteByBreakTypeAsync(string userId, string breakTypeId)
        {
            // Get all breaks for the break type and delete them
            var breaksToDelete = await GetByBreakTypeAsync(userId, breakTypeId);
            var batchTransactions = new List<TableTransactionAction>();

            foreach (var breakEntity in breaksToDelete)
            {
                batchTransactions.Add(new TableTransactionAction(TableTransactionActionType.Delete, breakEntity));

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
    }
}