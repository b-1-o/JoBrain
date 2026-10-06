import { type ClassValue, clsx } from "clsx";
import { format as dateFnsFormat, formatDistanceToNow } from "date-fns";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes without conflicts. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Format a date (default: localized long date, e.g. "Oct 6, 2026"). */
export function formatDate(
  date: Date | string,
  pattern = "PP",
): string {
  const value = typeof date === "string" ? new Date(date) : date;
  return dateFnsFormat(value, pattern);
}

/** Relative time, e.g. "2 days ago". */
export function formatRelative(date: Date | string): string {
  const value = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(value, { addSuffix: true });
}

/** URL/handle-safe slug from free text. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Truncate string with ellipsis. */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return `${text.slice(0, Math.max(0, length - 1)).trimEnd()}…`;
}
