import { format } from "date-fns";

/** ISO string (UTC) → value for <input type="datetime-local"> in the user's timezone. */
export function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  return format(new Date(iso), "yyyy-MM-dd'T'HH:mm");
}

/** <input type="datetime-local"> value (local time) → timezone-aware ISO string, or null. */
export function fromDatetimeLocal(value: string): string | null {
  if (!value) return null;
  return new Date(value).toISOString();
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return format(new Date(iso), "d MMM yyyy, HH:mm");
}
