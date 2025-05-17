// src/pages/settings/time-zones/types.ts

/**
 * Represents information about a time zone.
 */
export interface TimeZoneInfo {
    /** The unique identifier for the time zone. */
    zoneId: string;
    /** An array of city names within the time zone. */
    cities: string[];
    /** The name of the country associated with the time zone. */
    countryName: string;
    /** The continent where the time zone is located. */
    continent: string;
    /** UTC offset as a decimal number in hours (e.g., 5.5 for UTC+5:30) */
    utcOffset: number;
    /** The hours part of the UTC offset (e.g., 5 for UTC+5:30) */
    utcOffsetHours: number;
    /** The minutes part of the UTC offset (e.g., 30 for UTC+5:30) */
    utcOffsetMinutes: number;
    /** Alternative name for the timezone */
    alias?: string;
    /** Indicates whether this timezone is the user's home timezone */
    isHome?: boolean;
    /** Weather information for this timezone location */
    weatherInfo?: string;
    /** Flag to indicate this is a newly added timezone that should be shown at the top */
    isNewlyAdded?: boolean;
}

/**
 * Extends HTMLElement to allow storing event handler references
 * This interface enables us to attach properties to DOM elements without TypeScript errors
 */
export interface ExtendedHTMLElement extends HTMLElement {
    _tzinfo_shown_handler?: EventListener;
    _tzinfo_hidden_handler?: EventListener;
    _tzinfo_interval?: number | null;
    _tzinfo_data?: TimeZoneInfo;
    _fixed_tzinfo?: TimeZoneInfo;
}

/**
 * Represents paged search results for time zones
 */
export interface PagedTimeZoneResults {
    pagedResults: TimeZoneInfo[];
    totalCount: number;
}