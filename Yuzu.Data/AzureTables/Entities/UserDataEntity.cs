using Azure;
using Azure.Data.Tables;
using System;

namespace Yuzu.Data.AzureTables.Entities
{
    public class UserDataEntity : ITableEntity
    {
        public string PartitionKey { get; set; } = string.Empty; // userId
        public string RowKey { get; set; } = string.Empty; // dataKey
        public DateTimeOffset? Timestamp { get; set; }
        public ETag ETag { get; set; }

        // Business Properties
        public string Value { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public UserDataEntity() { }

        public UserDataEntity(string userId, string dataKey)
        {
            PartitionKey = userId;
            RowKey = dataKey;
        }
    }
}