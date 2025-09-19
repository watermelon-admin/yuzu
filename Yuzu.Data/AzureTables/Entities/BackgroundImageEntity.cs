using Azure;
using Azure.Data.Tables;
using System;

namespace Yuzu.Data.AzureTables.Entities
{
    public class BackgroundImageEntity : ITableEntity
    {
        public string PartitionKey { get; set; } = string.Empty; // userId or "system"
        public string RowKey { get; set; } = string.Empty; // imageId (GUID)
        public DateTimeOffset? Timestamp { get; set; }
        public ETag ETag { get; set; }

        // Business Properties
        public string FileName { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string ThumbnailUrl { get; set; } = string.Empty;
        public string FullImageUrl { get; set; } = string.Empty;
        public string ThumbnailPath { get; set; } = string.Empty;
        public string FullImagePath { get; set; } = string.Empty;
        public bool IsSystem { get; set; }
        public DateTime UploadedAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public BackgroundImageEntity() { }

        public BackgroundImageEntity(string partitionKey, string imageId)
        {
            PartitionKey = partitionKey;
            RowKey = imageId;
        }
    }
}