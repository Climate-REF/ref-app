// Ensure that the why did you render tool is imported first
import "./wdyr";
import "./instrument";

import * as Sentry from "@sentry/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { client } from "@/client/client.gen";
import { getStoredApiEndpoint } from "@/lib/apiEndpoint";
import { routeTree } from "@/routeTree.gen";

import "./styles/global.css";

// A deploy replaces the hashed asset files, so a tab left open asks for chunks that no longer exist.
// Reload once to pick up the new build, rate limited so a persistent failure cannot loop.
const RELOAD_KEY = "chunk-reload-at";
const RELOAD_COOLDOWN_MS = 30_000;
window.addEventListener("vite:preloadError", (event) => {
  const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
  if (Date.now() - last < RELOAD_COOLDOWN_MS) {
    return;
  }
  event.preventDefault();
  sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  window.location.reload();
});

client.setConfig({ baseUrl: getStoredApiEndpoint() });
const queryClient = new QueryClient();

const router = createRouter({
  routeTree,
  context: {
    queryClient,
  },
  defaultPreload: "intent",
  // Since we're using React Query, we don't want loader calls to ever be stale
  // This will ensure that the loader is always called when the route is preloaded or visited
  defaultPreloadStaleTime: 0,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }

  interface StaticDataRouteOption {
    title?: string;
  }
}

createRoot(document.getElementById("root")!, {
  // Callback called when an error is thrown and not caught by an ErrorBoundary.
  onUncaughtError: Sentry.reactErrorHandler((error, errorInfo) => {
    console.warn("Uncaught error", error, errorInfo.componentStack);
  }),
  // Callback called when React catches an error in an ErrorBoundary.
  onCaughtError: Sentry.reactErrorHandler(),
  // Callback called when React automatically recovers from errors.
  onRecoverableError: Sentry.reactErrorHandler(),
}).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
