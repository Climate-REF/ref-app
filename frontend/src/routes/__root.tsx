import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import { diagnosticsListOptions } from "@/client/@tanstack/react-query.gen.ts";
import { AppSidebar } from "@/components/app/appSidebar.tsx";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { type QueryClient, useSuspenseQuery } from "@tanstack/react-query";

function AppLayout() {
  const { data } = useSuspenseQuery(diagnosticsListOptions());

  return (
    <>
      <SidebarProvider>
        <AppSidebar diagnostics={data.data ?? []} />
        <SidebarInset className="overflow-hidden">
          <Outlet />
        </SidebarInset>
      </SidebarProvider>
      <ReactQueryDevtools initialIsOpen={false} />
      <TanStackRouterDevtools />
    </>
  );
}

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  component: AppLayout,
});
