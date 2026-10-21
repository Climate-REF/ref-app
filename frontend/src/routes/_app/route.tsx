import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { ErrorBoundary } from "@/components/app/errorBoundary";
import { ComponentErrorFallback } from "@/components/app/errorFallback";

function Content() {
  // A page that failed is shown again once the visitor navigates elsewhere
  const pathname = useLocation({ select: (location) => location.pathname });
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <ErrorBoundary
        resetKeys={[pathname]}
        fallback={({ error, reset }) => (
          <ComponentErrorFallback error={error} resetError={reset} />
        )}
      >
        <Outlet />
      </ErrorBoundary>
    </div>
  );
}

export const Route = createFileRoute("/_app")({
  component: Content,
});
