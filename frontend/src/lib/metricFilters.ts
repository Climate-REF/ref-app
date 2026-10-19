/**
 * Split a comma separated list, trimming each entry and dropping empty ones.
 */
export function parseCommaList(text: string): string[] {
  return text
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}
