import { init } from "@plausible-analytics/tracker";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { ErrorBoundary } from "@/components/app/errorBoundary";
import { ErrorFallback } from "@/components/app/errorFallback";
import { Footer } from "@/components/app/footer";
import { Navbar } from "@/components/app/navbar.tsx";

// Initialize Plausible Analytics
init({
  domain: "climate-ref.org",
  endpoint: "https://staging.climate-ref.org/log/api/event",
  outboundLinks: true,
  captureOnLocalhost: false,
  fileDownloads: true,
});

function AppLayout() {
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

        // In production, you might want to send this to an error reporting service
        // Example: Sentry.captureException(error, { contexts: { errorInfo } });
      }}
    >
      <Navbar />
      <ErrorBoundary
        fallback={<ErrorFallback title="Page Error" showHomeButton={true} />}
      >
        <div className="min-h-screen">
          <Outlet />
        </div>
      </ErrorBoundary>
      <Footer />

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
