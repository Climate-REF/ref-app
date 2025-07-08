import { createFileRoute, Outlet } from "@tanstack/react-router";

function Content() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <Outlet />
    </div>
  );
}

export const Route = createFileRoute("/_app")({
  component: Content,
});
