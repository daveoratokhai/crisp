/** Notion's default date format for "Last edited time": "September 28, 2026". */
export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

/** Date plus time, for timestamps dense enough that the day alone is ambiguous: "Sep 28, 2026, 3:04 PM". */
export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}
