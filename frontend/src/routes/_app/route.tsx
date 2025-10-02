import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ErrorBoundary } from "@/components/app/errorBoundary";
import { ComponentErrorFallback } from "@/components/app/errorFallback";
import { WelcomeModal } from "@/components/app/welcomeModal";

function Content() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <ErrorBoundary fallback={<ComponentErrorFallback />}>
        <Outlet />
        <WelcomeModal />
      </ErrorBoundary>
    </div>
  );
}

export const Route = createFileRoute("/_app")({
  component: Content,
});
