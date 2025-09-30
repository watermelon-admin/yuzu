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
    public class BackgroundImageRepository : IBackgroundImageRepository
    {
        private readonly TableClient _tableClient;
        private readonly ILogger<BackgroundImageRepository> _logger;
        private const string TableName = "BackgroundImages";
        private const string SystemPartitionKey = "system";

        public BackgroundImageRepository(IConfiguration configuration, ILogger<BackgroundImageRepository> logger)
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

        public async Task<BackgroundImageEntity?> GetAsync(string partitionKey, string imageId)
        {
            try
            {
                var response = await _tableClient.GetEntityAsync<BackgroundImageEntity>(partitionKey, imageId);
                return response.Value;
            }
            catch (RequestFailedException ex) when (ex.Status == 404)
            {
                return null;
            }
        }

        public async Task<IEnumerable<BackgroundImageEntity>> GetUserImagesAsync(string userId)
        {
            var query = _tableClient.QueryAsync<BackgroundImageEntity>(e => e.PartitionKey == userId);
            var results = new List<BackgroundImageEntity>();

            await foreach (var entity in query)
            {
                results.Add(entity);
            }

            return results;
        }

        public async Task<IEnumerable<BackgroundImageEntity>> GetSystemImagesAsync()
        {
            var query = _tableClient.QueryAsync<BackgroundImageEntity>(e => e.PartitionKey == SystemPartitionKey);
            var results = new List<BackgroundImageEntity>();

            await foreach (var entity in query)
            {
                results.Add(entity);
            }

            return results;
        }

        public async Task<IEnumerable<BackgroundImageEntity>> GetAllForUserAsync(string userId)
        {
            // Get both user and system images (requires two queries)
            var userImagesTask = GetUserImagesAsync(userId);
            var systemImagesTask = GetSystemImagesAsync();

            await Task.WhenAll(userImagesTask, systemImagesTask);

            return userImagesTask.Result.Concat(systemImagesTask.Result);
        }

        public async Task<BackgroundImageEntity> CreateAsync(BackgroundImage image)
        {
            var imageId = Guid.NewGuid().ToString();
            var partitionKey = image.IsSystem ? SystemPartitionKey : (image.UserId ?? throw new InvalidOperationException("UserId cannot be null for non-system images"));

            var entity = new BackgroundImageEntity(partitionKey, imageId)
            {
                FileName = image.FileName,
                Title = image.Title,
                ThumbnailUrl = image.ThumbnailUrl,
                FullImageUrl = image.FullImageUrl,
                ThumbnailPath = image.ThumbnailPath,
                FullImagePath = image.FullImagePath,
                IsSystem = image.IsSystem,
                UploadedAt = image.UploadedAt,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _tableClient.AddEntityAsync(entity);
            return entity;
        }

        public async Task<BackgroundImageEntity> UpdateAsync(string partitionKey, string imageId, BackgroundImage image)
        {
            var existing = await GetAsync(partitionKey, imageId);
            if (existing == null)
            {
                throw new InvalidOperationException($"Background image not found: {partitionKey}/{imageId}");
            }

            existing.FileName = image.FileName;
            existing.Title = image.Title;
            existing.ThumbnailUrl = image.ThumbnailUrl;
            existing.FullImageUrl = image.FullImageUrl;
            existing.ThumbnailPath = image.ThumbnailPath;
            existing.FullImagePath = image.FullImagePath;
            existing.UpdatedAt = DateTime.UtcNow;

            await _tableClient.UpdateEntityAsync(existing, existing.ETag, TableUpdateMode.Replace);
            return existing;
        }

        public async Task DeleteAsync(string partitionKey, string imageId)
        {
            try
            {
                await _tableClient.DeleteEntityAsync(partitionKey, imageId);
            }
            catch (RequestFailedException ex) when (ex.Status == 404)
            {
                _logger.LogDebug("Attempted to delete non-existent image: {PartitionKey}/{ImageId}", partitionKey, imageId);
            }
        }

        public async Task DeleteUserImagesAsync(string userId)
        {
            var query = _tableClient.QueryAsync<BackgroundImageEntity>(e => e.PartitionKey == userId && !e.IsSystem);
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
    }
}