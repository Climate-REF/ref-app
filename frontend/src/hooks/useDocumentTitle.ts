import { useMatches } from "@tanstack/react-router";
import { useEffect, useState } from "react";

const BASE_TITLE = "Climate REF";

/**
 * Hook that updates the document title based on the current route's staticData.
 * Uses route matches to find the most specific title in the route hierarchy.
 * Returns the current title for use with React's <title> component.
 *
 * For dynamic titles, you can still use <title> which will override this hook.
 */
export function useDocumentTitle() {
  const matches = useMatches();
  const [title, setTitle] = useState(BASE_TITLE);

  useEffect(() => {
    // Find the most specific route with a title in staticData
    // Iterate from the end (most specific) to start (least specific)
    for (let i = matches.length - 1; i >= 0; i--) {
      const match = matches[i];
      const routeTitle = match?.staticData?.title;

      if (routeTitle && typeof routeTitle === "string") {
        const fullTitle = `${routeTitle} - ${BASE_TITLE}`;
        setTitle(fullTitle);
        return;
      }
    }

    // If no title found, use base title
    setTitle(BASE_TITLE);
  }, [matches]);

  return title;
}
