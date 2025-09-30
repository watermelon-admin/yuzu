using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Yuzu.Data.AzureTables.Repositories;
using Yuzu.Data.Models;
using Yuzu.Data.Services.Interfaces;

namespace Yuzu.Data.Services
{
    /// <summary>
    /// Service implementation for managing user data
    /// </summary>
    public class UserDataService : IUserDataService
    {
        private readonly IUserDataRepository _repository;
        private readonly ILogger<UserDataService> _logger;

        /// <summary>
        /// Initializes a new instance of the UserDataService class
        /// </summary>
        /// <param name="repository">The user data repository</param>
        /// <param name="logger">The logger</param>
        public UserDataService(IUserDataRepository repository, ILogger<UserDataService> logger)
        {
            _repository = repository ?? throw new ArgumentNullException(nameof(repository));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <inheritdoc />
        public async Task<List<UserDataItem>> GetByUserIdAsync(string userId)
        {
            try
            {
                var entities = await _repository.GetAllForUserAsync(userId);
                return entities.Select(e => new UserDataItem
                {
                    UserId = e.PartitionKey,
                    DataKey = e.RowKey,
                    Value = e.Value,
                    CreatedAt = e.CreatedAt,
                    UpdatedAt = e.UpdatedAt
                }).ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting user data items for user {UserId}", userId);
                throw;
            }
        }

        /// <inheritdoc />
        public async Task<UserDataItem?> GetAsync(string userId, string dataKey)
        {
            try
            {
                var entity = await _repository.GetAsync(userId, dataKey);
                if (entity == null)
                    return null;

                return new UserDataItem
                {
                    UserId = entity.PartitionKey,
                    DataKey = entity.RowKey,
                    Value = entity.Value,
                    CreatedAt = entity.CreatedAt,
                    UpdatedAt = entity.UpdatedAt
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting user data item {DataKey} for user {UserId}", dataKey, userId);
                throw;
            }
        }

        /// <inheritdoc />
        public async Task<UserDataItem> CreateAsync(UserDataItem userDataItem)
        {
            try
            {
                var entity = await _repository.UpsertAsync(userDataItem.UserId, userDataItem.DataKey, userDataItem.Value);

                return new UserDataItem
                {
                    UserId = entity.PartitionKey,
                    DataKey = entity.RowKey,
                    Value = entity.Value,
                    CreatedAt = entity.CreatedAt,
                    UpdatedAt = entity.UpdatedAt
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating user data item {DataKey} for user {UserId}",
                    userDataItem.DataKey, userDataItem.UserId);
                throw;
            }
        }

        /// <inheritdoc />
        public async Task<UserDataItem> UpdateAsync(UserDataItem userDataItem)
        {
            return await UpsertAsync(userDataItem);
        }

        /// <inheritdoc />
        public async Task<UserDataItem> UpsertAsync(UserDataItem userDataItem)
        {
            try
            {
                var entity = await _repository.UpsertAsync(userDataItem.UserId, userDataItem.DataKey, userDataItem.Value);

                return new UserDataItem
                {
                    UserId = entity.PartitionKey,
                    DataKey = entity.RowKey,
                    Value = entity.Value,
                    CreatedAt = entity.CreatedAt,
                    UpdatedAt = entity.UpdatedAt
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error upserting user data item {DataKey} for user {UserId}",
                    userDataItem.DataKey, userDataItem.UserId);
                throw;
            }
        }

        /// <inheritdoc />
        public async Task<bool> DeleteAsync(string userId, string dataKey)
        {
            try
            {
                await _repository.DeleteAsync(userId, dataKey);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting user data item {DataKey} for user {UserId}", dataKey, userId);
                throw;
            }
        }

        /// <inheritdoc />
        public async Task<List<UserDataItem>> InitializeDefaultsAsync(string userId, string homeTimeZone = "UTC")
        {
            try
            {
                _logger.LogInformation("Initializing default user data for user {UserId}", userId);

                var defaultItems = new List<UserDataItem>
                {
                    new UserDataItem
                    {
                        UserId = userId,
                        DataKey = UserDataKey.HomeTimeZone.ToString(),
                        Value = homeTimeZone
                    },
                    new UserDataItem
                    {
                        UserId = userId,
                        DataKey = UserDataKey.ConfirmBreakScreenExit.ToString(),
                        Value = "true"
                    },
                    new UserDataItem
                    {
                        UserId = userId,
                        DataKey = UserDataKey.AdditionalTimeZones.ToString(),
                        Value = "Europe/Berlin,Europe/London,America/New_York,Asia/Tokyo"
                    }
                };

                var createdItems = new List<UserDataItem>();
                foreach (var item in defaultItems)
                {
                    var created = await UpsertAsync(item);
                    createdItems.Add(created);
                }

                _logger.LogInformation("Initialized {Count} default user data items for user {UserId}",
                    createdItems.Count, userId);

                return createdItems;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error initializing default user data for user {UserId}", userId);
                throw;
            }
        }

        /// <inheritdoc />
        public async Task DeleteAllForUserAsync(string userId)
        {
            try
            {
                _logger.LogInformation("Deleting all user data for user {UserId}", userId);
                await _repository.DeleteAllForUserAsync(userId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting all user data for user {UserId}", userId);
                throw;
            }
        }
    }
}