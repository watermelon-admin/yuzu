declare namespace luxon {
    class DateTime {
        static now(): DateTime;
        static fromISO(text: string): DateTime;
        static fromObject(obj: any): DateTime;
        static fromMillis(ms: number): DateTime;
        static fromFormat(text: string, format: string): DateTime;
        static fromJSDate(date: Date): DateTime;
        static fromRFC2822(text: string): DateTime;
        static fromSQL(text: string): DateTime;
        static fromSeconds(seconds: number): DateTime;
        static fromHTTP(text: string): DateTime;
        static invalid(reason: any): DateTime;
        static isDateTime(o: any): boolean;
        static local(year?: number, month?: number, day?: number, hour?: number, minute?: number, second?: number, millisecond?: number): DateTime;
        static max(...dateTimes: DateTime[]): DateTime;
        static min(...dateTimes: DateTime[]): DateTime;
        static utc(year?: number, month?: number, day?: number, hour?: number, minute?: number, second?: number, millisecond?: number): DateTime;
        static TIME_SIMPLE: any;
        toLocaleString(format: any): string;
        set(values: any): DateTime;
        setZone(zone: string): DateTime;
        setLocale(locale: string): DateTime; // Added setLocale method
        startOf(unit: string): DateTime;
        plus(values: any): DateTime;
        minus(values: any): DateTime;
        valueOf(): number;
        toISO(): string;
        toMillis(): number;
        toSeconds(): number;
        toFormat(format: string): string;
        hour: number;
        minute: number;
    }
}