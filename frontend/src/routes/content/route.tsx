import { MDXProvider } from "@mdx-js/react";
import { createFileRoute, Outlet } from "@tanstack/react-router";

function Content() {
  const components = {};

  return (
    <MDXProvider components={components}>
      <article className="prose prose-slate dark:prose-invert flex flex-1 flex-col gap-4 container mx-auto mt-8">
        <Outlet />
      </article>
    </MDXProvider>
  );
}

export const Route = createFileRoute("/content")({
  component: Content,
});
