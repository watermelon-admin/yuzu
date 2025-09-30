using Azure;
using Azure.Data.Tables;
using System;

namespace Yuzu.Data.AzureTables.Entities
{
    public class BreakEntity : ITableEntity
    {
        private const string DefaultRowKey = "break";

        public string PartitionKey { get; set; } = string.Empty; // breakId (GUID)
        public string RowKey { get; set; } = DefaultRowKey; // Constant value - only one document per partition
        public DateTimeOffset? Timestamp { get; set; }
        public ETag ETag { get; set; }

        // Business Properties
        public string UserId { get; set; } = string.Empty; // Stored as a property instead of RowKey
        public string BreakTypeId { get; set; } = string.Empty; // GUID reference
        public string BreakTypeName { get; set; } = string.Empty; // Denormalized for display
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public BreakEntity() { }

        public BreakEntity(string breakId, string userId)
        {
            PartitionKey = breakId;
            RowKey = DefaultRowKey;
            UserId = userId;
        }
    }
}