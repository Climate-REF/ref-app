import PageHeader, {
  type BreadcrumbContent,
} from "@/components/app/pageHeader.tsx";
import { MDXProvider } from "@mdx-js/react";
import { Outlet, useMatches } from "@tanstack/react-router";

interface RouteInfo {
  breadcrumbs?: BreadcrumbContent[];
  title?: string;
}

export default function ContentLayout() {
  const matches: UIMatch<RouteInfo, unknown>[] = useMatches();
  const components = {};

  // Find the last route match that has breadcrumbs data
  const routeMatch = matches.filter((match) => match.data?.breadcrumbs).pop(); // Get the last one as it's the most specific route

  const title = routeMatch?.data.title || "";
  const breadcrumbs = routeMatch?.data.breadcrumbs || [];

  return (
    <MDXProvider components={components}>
      <div>
        <PageHeader title={title} breadcrumbs={breadcrumbs} />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <Outlet />
        </div>
      </div>
    </MDXProvider>
  );
}
