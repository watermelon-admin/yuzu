using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace Yuzu.Time
{
    public class TimeZoneData
    {
        public required string IanaId { get; set; }
        public required string Continent { get; set; }
        public required string City { get; set; }
        public required string Country { get; set; }
    }

    public static class TimeZoneLoader
    {
        public static List<TimeZoneData> LoadTimeZones()
        {
            var timezones = new List<TimeZoneData>();
            var filePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Data", "timezones.txt");

            if (!File.Exists(filePath))
            {
                return timezones;
            }

            var lines = File.ReadAllLines(filePath);
            foreach (var line in lines)
            {
                if (string.IsNullOrWhiteSpace(line) || line.StartsWith("#"))
                    continue;

                var parts = line.Split('|');
                if (parts.Length < 4)
                    continue;

                timezones.Add(new TimeZoneData
                {
                    IanaId = parts[0],
                    Continent = parts[1],
                    City = parts[2],
                    Country = parts[3]
                });
            }

            return timezones;
        }
    }
} 