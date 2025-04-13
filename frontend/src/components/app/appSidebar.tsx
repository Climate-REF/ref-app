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

interface MetricInfo {
  provider: { slug: string };
  slug: string;
  name: string;
}

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
      title: "Thematic Areas",
      url: "/explorer?tab=themes&theme=atmosphere",
      items: [
        {
          title: "Atmosphere",
          url: "/explorer?tab=themes&theme=atmosphere",
        },
        {
          title: "Earth System",
          url: "/explorer?tab=themes&theme=earth-system",
        },
      ],
    },
    {
      title: "Diagnostics",
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
        <span className="font-medium">AR7 Fast Track REF</span>
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
