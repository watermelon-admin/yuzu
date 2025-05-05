using System;
using System.Collections.Generic;
using System.Linq;

namespace Yuzu.Time
{
    public static class TimeZones
    {
        private static List<TimeZoneData> _timeZones = [];

        public static List<TimeZoneData> GetAll()
        {
            if (_timeZones.Count == 0)
            {
                _timeZones = TimeZoneLoader.LoadTimeZones();
            }
            return _timeZones;
        }

        public static TimeZoneData? GetTimeZoneById(string ianaId)
        {
            return GetAll().FirstOrDefault(tz => tz.IanaId == ianaId);
        }

        public static IEnumerable<TimeZoneData> SearchTimeZones(string searchString, int pageNumber = 1, int pageSize = 10)
        {
            if (string.IsNullOrWhiteSpace(searchString))
                return GetAll().Skip((pageNumber - 1) * pageSize).Take(pageSize);

            var normalizedSearchString = searchString.ToLower();
            return GetAll()
                .Where(tz =>
                    tz.IanaId.Contains(normalizedSearchString, StringComparison.CurrentCultureIgnoreCase) ||
                    tz.City.Contains(normalizedSearchString, StringComparison.CurrentCultureIgnoreCase) ||
                    tz.Country.Contains(normalizedSearchString, StringComparison.CurrentCultureIgnoreCase) ||
                    tz.Continent.Contains(normalizedSearchString, StringComparison.CurrentCultureIgnoreCase))
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize);
        }

        public static int GetTotalTimeZones(string? searchString = null)
        {
            if (string.IsNullOrWhiteSpace(searchString))
                return GetAll().Count;

            var normalizedSearchString = searchString.ToLower();
            return GetAll()
                .Count(tz =>
                    tz.IanaId.Contains(normalizedSearchString, StringComparison.CurrentCultureIgnoreCase) ||
                    tz.City.Contains(normalizedSearchString, StringComparison.CurrentCultureIgnoreCase) ||
                    tz.Country.Contains(normalizedSearchString, StringComparison.CurrentCultureIgnoreCase) ||
                    tz.Continent.Contains(normalizedSearchString, StringComparison.CurrentCultureIgnoreCase));
        }

        public static string GetDisplayName(TimeZoneData timeZone)
        {
            return $"{timeZone.City}, {timeZone.Country} ({timeZone.IanaId})";
        }
    }
}
