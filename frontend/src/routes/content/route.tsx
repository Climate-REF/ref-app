import PageHeader from "@/components/app/pageHeader.tsx";
import { MDXProvider } from "@mdx-js/react";
import {
  Outlet,
  createFileRoute,
  useChildMatches,
} from "@tanstack/react-router";

function Content() {
  const matches = useChildMatches();
  const match = matches[matches.length - 1];
  const title = match.staticData.title || "";
  const breadcrumbs = match.staticData.breadcrumbs || [];

  const components = {};

  return (
    <MDXProvider components={components}>
      <article className="prose prose-slate flex flex-1 flex-col gap-4 container mx-auto mt-8">
        <Outlet />
      </article>
    </MDXProvider>
  );
}

export const Route = createFileRoute("/content")({
  component: Content,
});
