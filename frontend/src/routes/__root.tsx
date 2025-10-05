import { init } from "@plausible-analytics/tracker";
import * as Sentry from "@sentry/react";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { ApiEndpointWarning } from "@/components/app/apiEndpointWarning";
import { ErrorBoundary } from "@/components/app/errorBoundary";
import { ErrorFallback } from "@/components/app/errorFallback";
import { Footer } from "@/components/app/footer";
import { Navbar } from "@/components/app/navbar.tsx";
import { WelcomeModal } from "@/components/app/welcomeModal";
import { useApiEndpoint } from "@/hooks/useApiEndpoint";

// Initialize Plausible Analytics
init({
  domain: "climate-ref.org",
  endpoint: "https://staging.climate-ref.org/log/api/event",
  outboundLinks: true,
  captureOnLocalhost: false,
  fileDownloads: true,
});

function AppLayout() {
  const { isUsingOverride } = useApiEndpoint();
  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-screen">
          <Navbar />
          <ErrorFallback
            title="Application Error"
            description="The application encountered an unexpected error. Please refresh the page to continue."
          />
        </div>
      }
      onError={(error, errorInfo) => {
        // Log to console in development
        if (import.meta.env.DEV) {
          console.error("Root ErrorBoundary caught error:", error, errorInfo);
        }

        Sentry.captureException(error, {
          contexts: {
            errorInfo: {
              componentStack: errorInfo.componentStack,
            },
          },
        });
      }}
    >
      <Navbar />
      <ErrorBoundary
        fallback={<ErrorFallback title="Page Error" showHomeButton={true} />}
      >
        <div className="min-h-screen flex flex-1 flex-col">
          {isUsingOverride && (
            <div className="container mx-auto px-4 py-2">
              <ApiEndpointWarning />
            </div>
          )}
          <Outlet />
        </div>
      </ErrorBoundary>
      <Footer />

      <WelcomeModal />
      <ReactQueryDevtools initialIsOpen={false} />
      <TanStackRouterDevtools />
    </ErrorBoundary>
  );
}

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  component: AppLayout,
});
