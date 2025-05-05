using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.Linq;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authentication;
using NodaTime;
using NodaTime.Text;
using NodaTime.TimeZones;

namespace Yuzu.Web.Tools
{
    public static class Helpers
    {
        public static string StripHtml(string sourceString, int? maxLength, bool? showEllipsis = false)
        {
            var resultString = Regex.Replace(sourceString, "<.*?>", string.Empty);

            if (!maxLength.HasValue) return resultString;

            if (!(resultString.Length > maxLength)) return resultString;

            resultString = resultString.Substring(0, (int)maxLength);

            if (showEllipsis != null && (bool)showEllipsis) resultString += " [...]";

            return resultString;
        }
    }

    public static class Time
    {

        public static IanaTimeZoneInfo? GetIanaTimeZoneInfoFromId(string zoneId)
        {
            var timeZoneLocation = TzdbDateTimeZoneSource.Default
                .ZoneLocations!.Where(zi => zi.ZoneId == zoneId).FirstOrDefault();

            if (timeZoneLocation == null)
            {
                return null;
            }

            var offset = DateTimeZoneProviders.Tzdb[zoneId].GetUtcOffset(Instant.FromDateTimeUtc(DateTime.UtcNow));
            var offsetTextPattern = OffsetPattern.CreateWithInvariantCulture("'UTC'+H:mm");
            var offsetValuePattern = OffsetPattern.CreateWithInvariantCulture("H.mm");
            var offsetText = offsetTextPattern.Format(offset);
            var offsetValueText = offsetValuePattern.Format(offset);
            float offsetValue = float.Parse(offsetValueText, CultureInfo.InvariantCulture);
            var zoneIdParts = zoneId.Split("/");

            string cityPart = string.Empty;
            string comments = timeZoneLocation.Comment ?? string.Empty;
            string continentPart = zoneIdParts[0];
            string countryPart = timeZoneLocation.CountryName;
            double latitude = timeZoneLocation.Latitude;
            double longitude = timeZoneLocation.Longitude;
            string officialZoneId = timeZoneLocation.ZoneId;
            string statePart = string.Empty;

            switch (zoneIdParts.Length)
            {
                // Special case for Antarctica/DumontDUrville - French research station ;-)
                case 2 when zoneIdParts[1] == "DumontDUrville":
                    cityPart = "Dumont-d'Urville";
                    break;
                case 2:
                    cityPart = zoneIdParts[1].Replace('_', ' ');
                    break;
                case 3 when continentPart != "Argentina":
                    cityPart = zoneIdParts[2].Replace('_', ' ');
                    break;
                case 3:
                    statePart = zoneIdParts[2].Replace('_', ' ');
                    break;
            }

            var ianaTimeZoneInfo = new IanaTimeZoneInfo
            {
                City = cityPart,
                Comments = comments,
                Continent = continentPart,
                Country = countryPart,
                Latitude = latitude,
                Longitude = longitude,
                OfficialZoneId = officialZoneId,
                State = statePart,
                UtcOffsetText = offsetText,
                UtcOffsetValue = offsetValue,
                ZoneId = timeZoneLocation.ZoneId
            };

            return ianaTimeZoneInfo;
        }

        public static List<IanaTimeZoneInfo> GetIanaTimezoneInfos()
        {
            var allTimeZones = TzdbDateTimeZoneSource.Default
                .ZoneLocations!
                .Select(tz =>
                {
                    var zone = DateTimeZoneProviders.Tzdb[tz.ZoneId];
                    var offset = zone.GetUtcOffset(Instant.FromDateTimeUtc(DateTime.UtcNow));
                    var offsetTextPattern = OffsetPattern.CreateWithInvariantCulture("'UTC'+H:mm");
                    var offsetValuePattern = OffsetPattern.CreateWithInvariantCulture("+H.mm");
                    var offsetText = offsetTextPattern.Format(offset);
                    var offsetValueText = offsetValuePattern.Format(offset);
                    float offsetValue = float.Parse(offsetValueText, CultureInfo.InvariantCulture);
                    var zoneIdParts = tz.ZoneId.Split("/");

                    // Get Daylight Saving Time status
                    DateTimeZone dateTimeZone = DateTimeZoneProviders.Tzdb[tz.ZoneId];
                    ZonedDateTime zonedDateTime = dateTimeZone.AtLeniently(LocalDateTime.FromDateTime(DateTime.UtcNow));
                    bool isDST = zonedDateTime.IsDaylightSavingTime();

                    string cityPart = string.Empty;
                    string comments = tz.Comment;
                    string continentPart = zoneIdParts[0];
                    string countryPart = string.Empty;
                    double latitude = tz.Latitude;
                    double longitude = tz.Longitude;
                    string officialZoneId = tz.ZoneId;
                    string statePart = string.Empty;

                    countryPart = tz.CountryName;

                    switch (zoneIdParts.Length)
                    {
                        // Special case for Antarctica/DumontDUrville - French research station ;-)
                        case 2 when zoneIdParts[1] == "DumontDUrville":
                            cityPart = "Dumont-d'Urville";
                            break;
                        case 2:
                            cityPart = zoneIdParts[1].Replace('_', ' ');
                            break;
                        case 3 when continentPart != "Argentina":
                            cityPart = zoneIdParts[2].Replace('_', ' ');
                            break;
                        case 3:
                            statePart = zoneIdParts[2].Replace('_', ' ');
                            break;
                    }

                    return new IanaTimeZoneInfo
                    {
                        City = cityPart,
                        Comments = comments,
                        Continent = continentPart,
                        Country = countryPart,
                        Latitude = latitude,
                        Longitude = longitude,
                        OfficialZoneId = officialZoneId,
                        State = statePart,
                        UtcOffsetText = offsetText,
                        UtcOffsetValue = offsetValue,
                        ZoneId = tz.ZoneId,
                        IsDaylightSavingTime = isDST
                    };
                })
                .OrderBy(tz => tz.UtcOffsetValue)
                .ThenBy(tz => tz.Country)
                .ThenBy(tz => tz.City)
                .ToList();

            return allTimeZones;
        }

        public static IEnumerable<IanaTimeZoneInfo> GetIanaTimeZoneInfosBySearchTerm(string searchTerm = "")
        {
            var allTimeZones = GetIanaTimezoneInfos();

            if (searchTerm == "") return allTimeZones;

            var selectedZones = from z in allTimeZones
                                where string.IsNullOrEmpty(searchTerm)
                                      || z.Continent.ToLower().Contains(searchTerm.ToLower())
                                      || z.Country.ToLower().Contains(searchTerm.ToLower())
                                      || z.City.ToLower().Contains(searchTerm.ToLower())
                                      || z.UtcOffsetText.ToLower().Contains(searchTerm.ToLower())
                                orderby z.Continent, z.Country, z.City
                                select z;

            return selectedZones.GroupBy(x => x.City).Select(c => c.First());
        }

        public static IEnumerable<IanaTimeZoneInfo> GetIanaTimeZoneInfosByTimezoneList(List<string> timezoneList)
        {
            var allTimeZones = GetIanaTimezoneInfos();

            var selectedZones = from z in allTimeZones
                                where timezoneList.Contains(z.ZoneId)
                                orderby z.Continent, z.Country, z.City
                                select z;

            return selectedZones;
        }

        public static string FormatTimeHHMM(ZonedDateTime sourceTime)
        {
            var formattedString = sourceTime.ToString("HH:mm", CultureInfo.InvariantCulture);

            return formattedString;
        }

        public static ZonedDateTime ConvertToTimeZone(ZonedDateTime sourceDateTime, string targetTimeZoneId)
        {
            var convertedTime = sourceDateTime.WithZone(DateTimeZoneProviders.Tzdb[targetTimeZoneId]);

            return convertedTime;
        }

        /// <summary>
        /// Converts a Unix timestamp to a local date and time.
        /// </summary>
        /// <param name="unixTimestamp">The Unix timestamp to convert.</param>
        /// <returns>The local date and time.</returns>
        public static LocalDateTime ConvertUnixTimestampToLocalDateTime(long unixTimestamp)
        {

            var instant = Instant.FromUnixTimeSeconds(unixTimestamp); 
            var zone = DateTimeZoneProviders.Tzdb.GetSystemDefault();  
            var localDateTime = instant.InZone(zone).LocalDateTime;

            return localDateTime;
        }

        // Given a TZID, return a string in the format City, Country
        public static string GetCityCountryFromZoneId(string zoneId)
        {
            var ianaTimeZoneInfo = GetIanaTimeZoneInfoFromId(zoneId);
            if (ianaTimeZoneInfo == null)
            {
                return string.Empty;
            }
            return $"{ianaTimeZoneInfo.City}, {ianaTimeZoneInfo.Country}";
        }

    }
}