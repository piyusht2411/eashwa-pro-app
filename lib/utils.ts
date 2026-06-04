import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function albumDuration (len: number) {
    const min = Math.floor(len/60);
    const sec = len%60;
    return `${min}:${sec<10 ? "0" : ""}${sec}`;
}

// Format an ISO date string as "12 May 2026, 12:00 AM" (12-hour clock).
// If the value isn't a parseable ISO date, returns it unchanged.
export function formatDateTime(value?: string | null) {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });
}

// Format date-only fields such as container assignment dates and production log dates.
// These values are stored without a meaningful time, so showing the parsed time would
// display 5:30 AM in IST for midnight UTC dates.
export function formatDateOnly(value?: string | null) {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}
