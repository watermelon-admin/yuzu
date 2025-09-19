using Azure;
using Azure.Data.Tables;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Yuzu.Data.AzureTables.Entities;

namespace Yuzu.Data.AzureTables.Repositories
{
    public class UserDataRepository : IUserDataRepository
    {
        private readonly TableClient _tableClient;
        private readonly ILogger<UserDataRepository> _logger;
        private const string TableName = "UserData";

        public UserDataRepository(IConfiguration configuration, ILogger<UserDataRepository> logger)
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

        public async Task<UserDataEntity?> GetAsync(string userId, string dataKey)
        {
            try
            {
                var response = await _tableClient.GetEntityAsync<UserDataEntity>(userId, dataKey);
                return response.Value;
            }
            catch (RequestFailedException ex) when (ex.Status == 404)
            {
                return null;
            }
        }

        public async Task<IEnumerable<UserDataEntity>> GetAllForUserAsync(string userId)
        {
            var query = _tableClient.QueryAsync<UserDataEntity>(e => e.PartitionKey == userId);
            var results = new List<UserDataEntity>();

            await foreach (var entity in query)
            {
                results.Add(entity);
            }

            return results;
        }

        public async Task<UserDataEntity> UpsertAsync(string userId, string dataKey, string value)
        {
            var entity = new UserDataEntity(userId, dataKey)
            {
                Value = value,
                UpdatedAt = DateTime.UtcNow
            };

            // Check if entity exists to set CreatedAt
            var existing = await GetAsync(userId, dataKey);
            if (existing != null)
            {
                entity.CreatedAt = existing.CreatedAt;
            }
            else
            {
                entity.CreatedAt = DateTime.UtcNow;
            }

            await _tableClient.UpsertEntityAsync(entity, TableUpdateMode.Replace);
            return entity;
        }

        public async Task DeleteAsync(string userId, string dataKey)
        {
            try
            {
                await _tableClient.DeleteEntityAsync(userId, dataKey);
            }
            catch (RequestFailedException ex) when (ex.Status == 404)
            {
                // Entity doesn't exist, which is fine for delete
                _logger.LogDebug("Attempted to delete non-existent user data: {UserId}/{DataKey}", userId, dataKey);
            }
        }

        public async Task DeleteAllForUserAsync(string userId)
        {
            var query = _tableClient.QueryAsync<UserDataEntity>(e => e.PartitionKey == userId);
            var batchTransactions = new List<TableTransactionAction>();

            await foreach (var entity in query)
            {
                batchTransactions.Add(new TableTransactionAction(TableTransactionActionType.Delete, entity));

                // Azure Tables batch operations have a limit of 100
                if (batchTransactions.Count >= 100)
                {
                    await _tableClient.SubmitTransactionAsync(batchTransactions);
                    batchTransactions.Clear();
                }
            }

            // Submit remaining batch
            if (batchTransactions.Any())
            {
                await _tableClient.SubmitTransactionAsync(batchTransactions);
            }
        }
    }
}