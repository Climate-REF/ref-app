/** One page of an offset-paginated collection from the API. */
interface CollectionPage {
  data: unknown[];
  total_count?: number | null;
}

/**
 * The offset of the next page to fetch, or `undefined` when there is nothing left
 *
 * Counts the items in every page loaded so far and compares them with the latest page's `total_count`.
 * Stops when the total is unknown or the latest page came back empty, so a wrong total cannot fetch forever.
 */
export function nextOffset(pages: CollectionPage[]): number | undefined {
  const lastPage = pages.at(-1);
  if (lastPage == null || lastPage.data.length === 0) {
    return undefined;
  }
  const totalCount = lastPage.total_count;
  if (totalCount == null) {
    return undefined;
  }
  const loaded = pages.reduce((acc, page) => acc + page.data.length, 0);
  return loaded < totalCount ? loaded : undefined;
}
