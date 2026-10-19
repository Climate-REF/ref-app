/** A copy of `search` without its undefined or empty string values, which would only clutter the URL. */
export function dropEmpty<T extends object>(search: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(search).filter(
      ([, value]) => value !== undefined && value !== "",
    ),
  ) as Partial<T>;
}
