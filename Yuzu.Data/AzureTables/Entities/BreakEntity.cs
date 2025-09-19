using Azure;
using Azure.Data.Tables;
using System;

namespace Yuzu.Data.AzureTables.Entities
{
    public class BreakEntity : ITableEntity
    {
        public string PartitionKey { get; set; } = string.Empty; // userId
        public string RowKey { get; set; } = string.Empty; // breakId (GUID)
        public DateTimeOffset? Timestamp { get; set; }
        public ETag ETag { get; set; }

        // Business Properties
        public string BreakTypeId { get; set; } = string.Empty; // GUID reference
        public string BreakTypeName { get; set; } = string.Empty; // Denormalized for display
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public BreakEntity() { }

        public BreakEntity(string userId, string breakId)
        {
            PartitionKey = userId;
            RowKey = breakId;
        }
    }
}