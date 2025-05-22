import { MDXProvider } from "@mdx-js/react";
import { Outlet, createFileRoute } from "@tanstack/react-router";

function Content() {
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
