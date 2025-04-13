import PageHeader from "@/components/app/pageHeader.tsx";
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

  return (
    <div>
      <PageHeader title={title} breadcrumbs={breadcrumbs} />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <Outlet />
      </div>
    </div>
  );
}

export const Route = createFileRoute("/_app")({
  component: Content,
});
