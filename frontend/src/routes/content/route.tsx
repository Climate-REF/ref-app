import { MDXProvider } from "@mdx-js/react";
import { Outlet, createFileRoute } from "@tanstack/react-router";

function Content() {
  const components = {};

  return (
    <MDXProvider components={components}>
      <Outlet />
    </MDXProvider>
  );
}

export const Route = createFileRoute("/content")({
  component: Content,
});
