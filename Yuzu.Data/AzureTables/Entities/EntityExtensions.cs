using System;
using Yuzu.Data.Models;

namespace Yuzu.Data.AzureTables.Entities
{
    /// <summary>
    /// Extension methods for converting between Azure Table entities and domain models
    /// </summary>
    public static class EntityExtensions
    {
        /// <summary>
        /// Converts a BackgroundImageEntity to a BackgroundImage model
        /// </summary>
        public static BackgroundImage ToBackgroundImage(this BackgroundImageEntity entity)
        {
            if (entity == null)
                throw new ArgumentNullException(nameof(entity));

            return new BackgroundImage
            {
                Id = entity.RowKey,
                UserId = entity.IsSystem ? null : entity.PartitionKey,
                FileName = entity.FileName,
                Title = entity.Title,
                ThumbnailUrl = entity.ThumbnailUrl,
                FullImageUrl = entity.FullImageUrl,
                ThumbnailPath = entity.ThumbnailPath,
                FullImagePath = entity.FullImagePath,
                IsSystem = entity.IsSystem,
                CreatedAt = entity.CreatedAt,
                UpdatedAt = entity.UpdatedAt
            };
        }

        /// <summary>
        /// Converts a BreakEntity to a Break model
        /// </summary>
        public static Break ToBreak(this BreakEntity entity)
        {
            if (entity == null)
                throw new ArgumentNullException(nameof(entity));

            return new Break
            {
                Id = entity.RowKey,
                UserId = entity.PartitionKey,
                BreakTypeId = entity.BreakTypeId,
                StartTime = entity.StartTime,
                EndTime = entity.EndTime,
                CreatedAt = entity.CreatedAt,
                UpdatedAt = entity.UpdatedAt
            };
        }

        /// <summary>
        /// Converts a BreakTypeEntity to a BreakType model
        /// </summary>
        public static BreakType ToBreakType(this BreakTypeEntity entity)
        {
            if (entity == null)
                throw new ArgumentNullException(nameof(entity));

            return new BreakType
            {
                Id = entity.RowKey,
                UserId = entity.PartitionKey,
                Name = entity.Name,
                DefaultDurationMinutes = entity.DefaultDurationMinutes,
                CountdownMessage = entity.CountdownMessage ?? string.Empty,
                CountdownEndMessage = entity.CountdownEndMessage ?? string.Empty,
                EndTimeTitle = entity.EndTimeTitle ?? string.Empty,
                BreakTimeStepMinutes = entity.BreakTimeStepMinutes,
                IconName = entity.IconName,
                ImageTitle = entity.ImageTitle,
                BackgroundImageChoices = entity.BackgroundImageChoices,
                Components = entity.Components,
                SortOrder = entity.SortOrder,
                UsageCount = entity.UsageCount,
                IsLocked = entity.IsLocked,
                CreatedAt = entity.CreatedAt,
                UpdatedAt = entity.UpdatedAt
            };
        }

        /// <summary>
        /// Converts a UserDataEntity to a UserDataItem model
        /// </summary>
        public static UserDataItem ToUserDataItem(this UserDataEntity entity)
        {
            if (entity == null)
                throw new ArgumentNullException(nameof(entity));

            return new UserDataItem
            {
                Id = 0, // UserDataEntity uses RowKey as the key, not as an ID
                UserId = entity.PartitionKey,
                DataKey = entity.RowKey,
                Value = entity.Value,
                CreatedAt = entity.CreatedAt,
                UpdatedAt = entity.UpdatedAt
            };
        }

        /// <summary>
        /// Creates a BackgroundImageEntity from a BackgroundImage model
        /// </summary>
        public static BackgroundImageEntity ToEntity(this BackgroundImage model, string partitionKey, string rowKey)
        {
            if (model == null)
                throw new ArgumentNullException(nameof(model));

            return new BackgroundImageEntity(partitionKey, rowKey)
            {
                FileName = model.FileName ?? string.Empty,
                Title = model.Title ?? string.Empty,
                ThumbnailUrl = model.ThumbnailUrl ?? string.Empty,
                FullImageUrl = model.FullImageUrl ?? string.Empty,
                ThumbnailPath = model.ThumbnailPath ?? string.Empty,
                FullImagePath = model.FullImagePath ?? string.Empty,
                IsSystem = model.IsSystem,
                CreatedAt = model.CreatedAt,
                UpdatedAt = model.UpdatedAt
            };
        }

        /// <summary>
        /// Creates a BreakEntity from a Break model
        /// </summary>
        public static BreakEntity ToEntity(this Break model, string partitionKey, string rowKey)
        {
            if (model == null)
                throw new ArgumentNullException(nameof(model));

            return new BreakEntity(partitionKey, rowKey)
            {
                BreakTypeId = model.BreakTypeId,
                BreakTypeName = model.BreakType?.Name ?? string.Empty,
                StartTime = model.StartTime,
                EndTime = model.EndTime,
                CreatedAt = model.CreatedAt,
                UpdatedAt = model.UpdatedAt
            };
        }

        /// <summary>
        /// Creates a BreakTypeEntity from a BreakType model
        /// </summary>
        public static BreakTypeEntity ToEntity(this BreakType model, string partitionKey, string rowKey)
        {
            if (model == null)
                throw new ArgumentNullException(nameof(model));

            return new BreakTypeEntity(partitionKey, rowKey)
            {
                Name = model.Name ?? string.Empty,
                DefaultDurationMinutes = model.DefaultDurationMinutes,
                CountdownMessage = model.CountdownMessage ?? string.Empty,
                CountdownEndMessage = model.CountdownEndMessage ?? string.Empty,
                EndTimeTitle = model.EndTimeTitle ?? string.Empty,
                BreakTimeStepMinutes = model.BreakTimeStepMinutes,
                IconName = model.IconName ?? string.Empty,
                ImageTitle = model.ImageTitle ?? string.Empty,
                BackgroundImageChoices = model.BackgroundImageChoices ?? string.Empty,
                Components = model.Components ?? string.Empty,
                SortOrder = model.SortOrder,
                UsageCount = model.UsageCount,
                IsLocked = model.IsLocked,
                CreatedAt = model.CreatedAt,
                UpdatedAt = model.UpdatedAt
            };
        }

        /// <summary>
        /// Creates a UserDataEntity from a UserDataItem model
        /// </summary>
        public static UserDataEntity ToEntity(this UserDataItem model, string partitionKey, string rowKey)
        {
            if (model == null)
                throw new ArgumentNullException(nameof(model));

            return new UserDataEntity(partitionKey, rowKey)
            {
                Value = model.Value ?? string.Empty,
                CreatedAt = model.CreatedAt,
                UpdatedAt = model.UpdatedAt
            };
        }
    }
}