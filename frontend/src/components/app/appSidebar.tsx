import { SidebarLogo } from "@/components/app/sidebarLogo.tsx";
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

interface DiagnosticInfo {
  provider: { slug: string };
  slug: string;
  name: string;
}

interface AppSidebarProps extends ComponentProps<typeof Sidebar> {
  diagnostics: DiagnosticInfo[];
}

function computeSidebarNav(diagnostics: DiagnosticInfo[]) {
  return [
    {
      title: "Dashboard",
      url: "/",
    },
    {
      title: "Content",
      items: [
        {
          title: "About",
          url: "/content/about",
        },
      ],
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
      url: "/diagnostics",
      items: diagnostics.map((diagnostic) => ({
        title: diagnostic.name,
        url: `/diagnostics/${diagnostic.provider.slug}/${diagnostic.slug}`,
      })),
    },
  ];
}

export function AppSidebar({ diagnostics, ...props }: AppSidebarProps) {
  const sidebarNav = computeSidebarNav(diagnostics);
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarLogo />
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
