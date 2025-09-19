using Azure;
using Azure.Data.Tables;
using System;

namespace Yuzu.Data.AzureTables.Entities
{
    public class BreakTypeEntity : ITableEntity
    {
        public string PartitionKey { get; set; } = string.Empty; // userId
        public string RowKey { get; set; } = string.Empty; // breakTypeId (GUID)
        public DateTimeOffset? Timestamp { get; set; }
        public ETag ETag { get; set; }

        // Business Properties
        public string Name { get; set; } = string.Empty;
        public int DefaultDurationMinutes { get; set; }
        public string? CountdownMessage { get; set; }
        public string? CountdownEndMessage { get; set; }
        public string? EndTimeTitle { get; set; }
        public int BreakTimeStepMinutes { get; set; }
        public string? BackgroundImageChoices { get; set; }
        public string? ImageTitle { get; set; }
        public long UsageCount { get; set; }
        public string? IconName { get; set; }
        public string? Components { get; set; } // JSON data
        public bool IsLocked { get; set; }
        public int SortOrder { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public BreakTypeEntity() { }

        public BreakTypeEntity(string userId, string breakTypeId)
        {
            PartitionKey = userId;
            RowKey = breakTypeId;
        }
    }
}