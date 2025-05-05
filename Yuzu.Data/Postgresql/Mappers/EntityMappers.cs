using Yuzu.Data.Postgresql.Models;
using Yuzu.Data.Models;

namespace Yuzu.Data.Postgresql.Mappers
{
    /// <summary>
    /// Provides mapping functions between entity models and PostgreSQL entity models
    /// </summary>
    public static class EntityMappers
    {
        /// <summary>
        /// Maps a BackgroundImage model to a BackgroundImageEntity
        /// </summary>
        /// <param name="source">The source BackgroundImage model</param>
        /// <returns>The mapped BackgroundImageEntity</returns>
        public static BackgroundImageEntity ToPostgresEntity(this Yuzu.Data.Models.BackgroundImage source)
        {
            if (source == null) return null!;
            
            return new BackgroundImageEntity
            {
                Id = source.Id,
                UserId = source.UserId ?? string.Empty,
                FileName = source.FileName,
                Title = source.Title,
                ThumbnailPath = source.ThumbnailPath,
                FullImagePath = source.FullImagePath,
                ThumbnailUrl = source.ThumbnailUrl,
                FullImageUrl = source.FullImageUrl,
                UploadedAt = DateTime.UtcNow,
                IsSystem = source.IsSystem,
                CreatedAt = source.CreatedAt,
                UpdatedAt = source.UpdatedAt
            };
        }
        
        /// <summary>
        /// Maps a BackgroundImageEntity to a BackgroundImage model
        /// </summary>
        /// <param name="source">The source BackgroundImageEntity</param>
        /// <returns>The mapped BackgroundImage model</returns>
        public static Yuzu.Data.Models.BackgroundImage ToModel(this BackgroundImageEntity source)
        {
            if (source == null) return null!;
            
            return new Yuzu.Data.Models.BackgroundImage
            {
                Id = source.Id,
                UserId = source.UserId,
                FileName = source.FileName,
                Title = source.Title,
                ThumbnailPath = source.ThumbnailPath,
                FullImagePath = source.FullImagePath,
                ThumbnailUrl = source.ThumbnailUrl,
                FullImageUrl = source.FullImageUrl,
                IsSystem = source.IsSystem,
                CreatedAt = source.CreatedAt,
                UpdatedAt = source.UpdatedAt,
                UploadedAt = source.UploadedAt
            };
        }
        
        /// <summary>
        /// Maps a BreakType model to a BreakTypeEntity
        /// </summary>
        /// <param name="source">The source BreakType model</param>
        /// <returns>The mapped BreakTypeEntity</returns>
        public static BreakTypeEntity ToPostgresEntity(this BreakType source)
        {
            if (source == null) return null!;
            
            return new BreakTypeEntity
            {
                Id = source.Id,
                UserId = source.UserId,
                SortOrder = source.SortOrder,
                Name = source.Name,
                DefaultDurationMinutes = source.DefaultDurationMinutes,
                CountdownMessage = source.CountdownMessage,
                CountdownEndMessage = source.CountdownEndMessage,
                EndTimeTitle = source.EndTimeTitle,
                BreakTimeStepMinutes = source.BreakTimeStepMinutes,
                BackgroundImageChoices = source.BackgroundImageChoices,
                ImageTitle = source.ImageTitle,
                UsageCount = source.UsageCount,
                IconName = source.IconName,
                Components = source.Components,
                IsLocked = source.IsLocked,
                CreatedAt = source.CreatedAt,
                UpdatedAt = source.UpdatedAt
            };
        }
        
        /// <summary>
        /// Maps a BreakTypeEntity to a BreakType model
        /// </summary>
        /// <param name="source">The source BreakTypeEntity</param>
        /// <returns>The mapped BreakType model</returns>
        public static BreakType ToModel(this BreakTypeEntity source)
        {
            if (source == null) return null!;
            
            return new BreakType
            {
                Id = source.Id,
                UserId = source.UserId,
                SortOrder = source.SortOrder,
                Name = source.Name,
                DefaultDurationMinutes = source.DefaultDurationMinutes,
                CountdownMessage = source.CountdownMessage,
                CountdownEndMessage = source.CountdownEndMessage,
                EndTimeTitle = source.EndTimeTitle,
                BreakTimeStepMinutes = source.BreakTimeStepMinutes,
                BackgroundImageChoices = source.BackgroundImageChoices,
                ImageTitle = source.ImageTitle,
                UsageCount = source.UsageCount,
                IconName = source.IconName,
                Components = source.Components,
                IsLocked = source.IsLocked,
                CreatedAt = source.CreatedAt,
                UpdatedAt = source.UpdatedAt
            };
        }
        
        /// <summary>
        /// Maps a Break model to a BreakEntity
        /// </summary>
        /// <param name="source">The source Break model</param>
        /// <returns>The mapped BreakEntity</returns>
        public static BreakEntity ToPostgresEntity(this Break source)
        {
            if (source == null) return null!;
            
            return new BreakEntity
            {
                Id = source.Id,
                UserId = source.UserId,
                BreakTypeId = source.BreakTypeId,
                StartTime = source.StartTime,
                EndTime = source.EndTime,
                CreatedAt = source.CreatedAt,
                UpdatedAt = source.UpdatedAt
            };
        }
        
        /// <summary>
        /// Maps a BreakEntity to a Break model
        /// </summary>
        /// <param name="source">The source BreakEntity</param>
        /// <returns>The mapped Break model</returns>
        public static Break ToModel(this BreakEntity source)
        {
            if (source == null) return null!;
            
            return new Break
            {
                Id = source.Id,
                UserId = source.UserId,
                BreakTypeId = source.BreakTypeId,
                StartTime = source.StartTime,
                EndTime = source.EndTime,
                CreatedAt = source.CreatedAt,
                UpdatedAt = source.UpdatedAt
            };
        }
        
        /// <summary>
        /// Maps a UserDataItem model to a UserDataEntity
        /// </summary>
        /// <param name="source">The source UserDataItem model</param>
        /// <returns>The mapped UserDataEntity</returns>
        public static UserDataEntity ToPostgresEntity(this UserDataItem source)
        {
            if (source == null) return null!;
            
            return new UserDataEntity
            {
                Id = source.Id,
                UserId = source.UserId,
                DataKey = source.DataKey,
                Value = source.Value,
                CreatedAt = source.CreatedAt,
                UpdatedAt = source.UpdatedAt
            };
        }
        
        /// <summary>
        /// Maps a UserDataEntity to a UserDataItem model
        /// </summary>
        /// <param name="source">The source UserDataEntity</param>
        /// <returns>The mapped UserDataItem model</returns>
        public static UserDataItem ToModel(this UserDataEntity source)
        {
            if (source == null) return null!;
            
            return new UserDataItem
            {
                Id = source.Id,
                UserId = source.UserId,
                DataKey = source.DataKey,
                Value = source.Value,
                CreatedAt = source.CreatedAt,
                UpdatedAt = source.UpdatedAt
            };
        }
    }
}