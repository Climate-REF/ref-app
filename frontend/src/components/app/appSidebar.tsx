import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Link } from "@tanstack/react-router";
import type { ComponentProps } from "react";
import { VersionSwitcher } from "./versionSwitcher.tsx";

interface MetricInfo {
  provider: { slug: string };
  slug: string;
  name: string;
}

// This is sample data.
const data = {
  versions: ["1.0.1", "1.1.0-alpha", "2.0.0-beta1"],
};

interface AppSidebarProps extends ComponentProps<typeof Sidebar> {
  metrics: MetricInfo[];
}

function computeSidebarNav(metrics: MetricInfo[]) {
  return [
    {
      title: "Dashboard",
      url: "/",
    },
    {
      title: "Data Explorer",
      url: "/explorer",
    },
    {
      title: "Metrics",
      url: "/metrics",
      items: metrics.map((metric) => ({
        title: metric.name,
        url: `/metrics/${metric.provider.slug}/${metric.slug}`,
      })),
    },
  ];
}

export function AppSidebar({ metrics, ...props }: AppSidebarProps) {
  const sidebarNav = computeSidebarNav(metrics);
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <VersionSwitcher
          versions={data.versions}
          defaultVersion={data.versions[0]}
        />
      </SidebarHeader>
      <SidebarContent>
        {sidebarNav.map((item) => {
          if (item.items) {
            return (
              <SidebarGroup key={item.title}>
                <SidebarGroupLabel asChild>
                  {item.url ? (
                    <Link to={item.url}>{item.title}</Link>
                  ) : (
                    <div>{item.title}</div>
                  )}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {item.items?.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        {/*<SidebarMenuButton asChild isActive={item.isActive}>*/}
                        <SidebarMenuButton asChild>
                          <Link to={item.url}>{item.title}</Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          }
          return (
            <SidebarGroup key={item.title}>
              <SidebarGroupContent>
                <SidebarMenuButton asChild>
                  <Link to={item.url}>{item.title}</Link>
                </SidebarMenuButton>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
