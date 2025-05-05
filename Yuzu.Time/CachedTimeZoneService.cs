using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Yuzu.Time
{
    /// <summary>
    /// Provides cached access to time zone data
    /// </summary>
    public class CachedTimeZoneService
    {
        private readonly IMemoryCache _cache;
        private readonly ILogger<CachedTimeZoneService> _logger;
        
        // Cache keys
        private const string AllTimeZonesKey = "AllTimeZones";
        private const string TimeZoneSearchKey = "TimeZoneSearch_{0}_Page{1}_Size{2}";
        private const string TimeZoneByIdKey = "TimeZone_{0}";
        private const string TotalTimeZonesKey = "TotalTimeZones_{0}";
        
        // Cache settings
        private static readonly TimeSpan DefaultCacheExpiration = TimeSpan.FromHours(24);
        private static readonly TimeSpan SearchCacheExpiration = TimeSpan.FromMinutes(30);
        
        /// <summary>
        /// Initializes a new instance of the <see cref="CachedTimeZoneService"/> class
        /// </summary>
        /// <param name="cache">Memory cache instance</param>
        /// <param name="logger">Logger</param>
        public CachedTimeZoneService(IMemoryCache cache, ILogger<CachedTimeZoneService> logger)
        {
            _cache = cache ?? throw new ArgumentNullException(nameof(cache));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }
        
        /// <summary>
        /// Gets all time zones with caching
        /// </summary>
        /// <returns>List of time zone data</returns>
        public List<TimeZoneData> GetAllTimeZones()
        {
            return _cache.GetOrCreate(AllTimeZonesKey, entry =>
            {
                _logger.LogInformation("Loading all time zones from file (cache miss)");
                entry.AbsoluteExpirationRelativeToNow = DefaultCacheExpiration;
                var result = TimeZones.GetAll();
                return result;
            })!;
        }
        
        /// <summary>
        /// Gets a time zone by its IANA ID with caching
        /// </summary>
        /// <param name="ianaId">The IANA time zone ID</param>
        /// <returns>Time zone data if found, null otherwise</returns>
        public TimeZoneData? GetTimeZoneById(string ianaId)
        {
            if (string.IsNullOrEmpty(ianaId))
            {
                return null;
            }
            
            string cacheKey = string.Format(TimeZoneByIdKey, ianaId);
            
            return _cache.GetOrCreate(cacheKey, entry =>
            {
                _logger.LogInformation("Looking up time zone {IanaId} (cache miss)", ianaId);
                entry.AbsoluteExpirationRelativeToNow = DefaultCacheExpiration;
                return TimeZones.GetTimeZoneById(ianaId);
            });
        }
        
        /// <summary>
        /// Searches time zones with caching
        /// </summary>
        /// <param name="searchString">Search query</param>
        /// <param name="pageNumber">Page number (1-based)</param>
        /// <param name="pageSize">Page size</param>
        /// <returns>Matching time zones</returns>
        public IEnumerable<TimeZoneData> SearchTimeZones(string searchString, int pageNumber = 1, int pageSize = 10)
        {
            searchString ??= string.Empty;
            string cacheKey = string.Format(TimeZoneSearchKey, searchString, pageNumber, pageSize);
            
            return _cache.GetOrCreate(cacheKey, entry =>
            {
                _logger.LogInformation("Searching time zones for '{SearchString}' page {PageNumber} (cache miss)", 
                    searchString, pageNumber);
                entry.AbsoluteExpirationRelativeToNow = SearchCacheExpiration;
                var result = TimeZones.SearchTimeZones(searchString, pageNumber, pageSize).ToList();
                return result;
            })!;
        }
        
        /// <summary>
        /// Gets the total number of time zones matching a search query with caching
        /// </summary>
        /// <param name="searchString">Search query</param>
        /// <returns>Total count</returns>
        public int GetTotalTimeZones(string? searchString = null)
        {
            searchString ??= string.Empty;
            string cacheKey = string.Format(TotalTimeZonesKey, searchString);
            
            return _cache.GetOrCreate(cacheKey, entry =>
            {
                _logger.LogInformation("Counting time zones for search '{SearchString}' (cache miss)", searchString);
                entry.AbsoluteExpirationRelativeToNow = SearchCacheExpiration;
                return TimeZones.GetTotalTimeZones(searchString);
            });
        }
        
        /// <summary>
        /// Gets a formatted display name for a time zone
        /// </summary>
        /// <param name="timeZone">Time zone data</param>
        /// <returns>Formatted display name</returns>
        public string GetDisplayName(TimeZoneData timeZone)
        {
            return TimeZones.GetDisplayName(timeZone);
        }
    }
}