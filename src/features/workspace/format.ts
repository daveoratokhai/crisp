/** Notion's default date format for "Last edited time": "September 28, 2026". */
export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
