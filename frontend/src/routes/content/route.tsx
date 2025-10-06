import { MDXProvider } from "@mdx-js/react";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { DataHealthWarning } from "@/components/app/dataHealthWarning";
import { LinkExternal } from "@/components/ui/link";

const components = {
  DataHealthWarning: () => {
    return <DataHealthWarning />;
  },
  a(props: any) {
    console.log("link", props);
    return <LinkExternal {...props} />;
  },
};

function Content() {
  console.log(components);
  return (
    <MDXProvider components={components}>
      <article className="prose prose-slate dark:prose-invert flex flex-1 flex-col container mx-auto mt-8 prose-a:text-oceanBlue prose-a:dark:text-icyBlue">
        <Outlet />
      </article>
    </MDXProvider>
  );
}

export const Route = createFileRoute("/content")({
  component: Content,
});
