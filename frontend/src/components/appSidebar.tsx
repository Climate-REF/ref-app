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
import { VersionSwitcher } from "@/components/versionSwitcher.tsx";
import type { ComponentProps } from "react";

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
      title: "Overview",
      items: [
        {
          title: "Project Structure",
          url: "#",
        },
      ],
    },
    {
      title: "Data explorer",
      items: [
        {
          title: "Data Explorer",
          url: "#",
        },
      ],
    },
    {
      title: "Metrics",
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
        {/* We create a SidebarGroup for each parent. */}
        {sidebarNav.map((item) => (
          <SidebarGroup key={item.title}>
            <SidebarGroupLabel>{item.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {item.items?.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    {/*<SidebarMenuButton asChild isActive={item.isActive}>*/}
                    <SidebarMenuButton asChild>
                      <a href={item.url}>{item.title}</a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
