import { metricsListMetricsOptions } from "@/client/@tanstack/react-query.gen.ts";
import { AppSidebar } from "@/components/appSidebar.tsx";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Outlet } from "react-router";

export default function AppLayout() {
  const { data } = useSuspenseQuery(metricsListMetricsOptions());

  return (
    <SidebarProvider>
      <AppSidebar metrics={data?.data ?? []} />
      <SidebarInset>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
