using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Yuzu.Data.Models;
using Yuzu.Data.Services.Interfaces;

namespace Yuzu.Data.Services
{
    /// <summary>
    /// Cached implementation of the break type service
    /// </summary>
    public class CachedBreakTypeService : IBreakTypeService
    {
        private readonly IBreakTypeService _breakTypeService;
        private readonly IMemoryCache _cache;
        private readonly ILogger<CachedBreakTypeService> _logger;
        
        private readonly TimeSpan _cacheDuration = TimeSpan.FromMinutes(5);
        
        /// <summary>
        /// Initializes a new instance of the CachedBreakTypeService class
        /// </summary>
        /// <param name="breakTypeService">The underlying break type service</param>
        /// <param name="cache">The memory cache</param>
        /// <param name="logger">The logger</param>
        public CachedBreakTypeService(IBreakTypeService breakTypeService, IMemoryCache cache, ILogger<CachedBreakTypeService> logger)
        {
            _breakTypeService = breakTypeService ?? throw new ArgumentNullException(nameof(breakTypeService));
            _cache = cache ?? throw new ArgumentNullException(nameof(cache));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }
        
        /// <inheritdoc />
        public async Task<List<BreakType>> GetAllAsync(string userId)
        {
            var cacheKey = $"breakTypes_{userId}";
            
            if (_cache.TryGetValue(cacheKey, out List<BreakType>? cachedBreakTypes) && cachedBreakTypes != null)
            {
                _logger.LogInformation("Cache hit for break types for user {UserId}", userId);
                return cachedBreakTypes;
            }
            
            _logger.LogInformation("Cache miss for break types for user {UserId}", userId);
            var breakTypes = await _breakTypeService.GetAllAsync(userId);
            
            _cache.Set(cacheKey, breakTypes, _cacheDuration);
            
            return breakTypes;
        }
        
        /// <inheritdoc />
        public async Task<BreakType?> GetAsync(string userId, string breakTypeId)
        {
            var cacheKey = $"breakType_{userId}_{breakTypeId}";

            if (_cache.TryGetValue(cacheKey, out BreakType? cachedBreakType))
            {
                _logger.LogInformation("Cache hit for break type with ID {Id} for user {UserId}", breakTypeId, userId);
                return cachedBreakType;
            }

            _logger.LogInformation("Cache miss for break type with ID {Id} for user {UserId}", breakTypeId, userId);
            var breakType = await _breakTypeService.GetAsync(userId, breakTypeId);

            if (breakType != null)
            {
                _cache.Set(cacheKey, breakType, _cacheDuration);
            }

            return breakType;
        }
        
        /// <inheritdoc />
        public async Task<BreakType> CreateAsync(BreakType breakType)
        {
            var result = await _breakTypeService.CreateAsync(breakType);
            
            // Invalidate caches
            InvalidateUserCache(breakType.UserId);
            
            return result;
        }
        
        /// <inheritdoc />
        public async Task<BreakType> UpdateAsync(BreakType breakType)
        {
            var result = await _breakTypeService.UpdateAsync(breakType);
            
            // Invalidate caches
            InvalidateUserCache(breakType.UserId);
            _cache.Remove($"breakType_{breakType.Id}");
            _cache.Remove($"breakType_{breakType.UserId}_{breakType.Id}");
            
            return result;
        }
        
        /// <inheritdoc />
        public async Task<bool> DeleteAsync(string userId, string breakTypeId)
        {
            var result = await _breakTypeService.DeleteAsync(userId, breakTypeId);

            // Invalidate caches
            InvalidateUserCache(userId);
            _cache.Remove($"breakType_{breakTypeId}");
            _cache.Remove($"breakType_{userId}_{breakTypeId}");

            return result;
        }
        
        /// <inheritdoc />
        public async Task<List<BreakType>> InitializeDefaultsAsync(string userId)
        {
            var result = await _breakTypeService.InitializeDefaultsAsync(userId);
            
            // Invalidate user cache
            InvalidateUserCache(userId);
            
            return result;
        }
        
        /// <inheritdoc />
        public async Task DeleteAllForUserAsync(string userId)
        {
            await _breakTypeService.DeleteAllForUserAsync(userId);
            
            // Invalidate user cache
            InvalidateUserCache(userId);
        }
        
        /// <summary>
        /// Invalidates all caches for a user
        /// </summary>
        /// <param name="userId">The user ID</param>
        private void InvalidateUserCache(string userId)
        {
            _cache.Remove($"breakTypes_{userId}");
        }
    }
}