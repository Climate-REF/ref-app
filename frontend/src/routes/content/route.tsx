import { MDXProvider } from "@mdx-js/react";
import { createFileRoute, Outlet } from "@tanstack/react-router";

function Content() {
  return (
    <MDXProvider components={{}}>
      <article className="prose prose-slate dark:prose-invert flex flex-1 flex-col container mx-auto mt-8 prose-a:text-oceanBlue prose-a:dark:text-icyBlue">
        <Outlet />
      </article>
    </MDXProvider>
  );
}

export const Route = createFileRoute("/content")({
  component: Content,
});
