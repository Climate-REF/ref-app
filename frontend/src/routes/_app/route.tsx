import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ErrorBoundary } from "@/components/app/errorBoundary";
import { ComponentErrorFallback } from "@/components/app/errorFallback";

function Content() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <ErrorBoundary fallback={<ComponentErrorFallback />}>
        <Outlet />
      </ErrorBoundary>
    </div>
  );
}

export const Route = createFileRoute("/_app")({
  component: Content,
});
