"use client";

import { Link } from "@tanstack/react-router";
import { Menu, Monitor, Moon, Sun, X } from "lucide-react";
import { useState } from "react";
import { NavbarLogo } from "@/components/app/navbarLogo.tsx";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils.ts";

const NAV_LINKS = [
  { title: "Diagnostics", to: "/diagnostics" },
  { title: "Data Explorer", to: "/explorer" },
  { title: "Executions", to: "/executions" },
  { title: "Datasets", to: "/datasets" },
] as const;

function NavItem({ title, to }: { title: string; to: string }) {
  return (
    <NavigationMenuItem asChild>
      <Link to={to} className={navigationMenuTriggerStyle()}>
        {title}
      </Link>
    </NavigationMenuItem>
  );
}

const THEME_DISPLAY = {
  light: { icon: Sun, label: "Light" },
  dark: { icon: Moon, label: "Dark" },
  system: { icon: Monitor, label: "System" },
} as const;

export function Navbar() {
  const { mode, cycle } = useTheme();
  const { icon: ThemeIcon, label: themeLabel } = THEME_DISPLAY[mode];
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <NavigationMenu className="w-full px-4 py-4 md:px-8">
      <div className="flex w-full flex-col gap-2">
        <div className="flex w-full items-center gap-4">
          <Link to={"/"} className={cn("relative")}>
            <NavbarLogo />
          </Link>

          <NavigationMenuList className="hidden md:flex">
            {NAV_LINKS.map((link) => (
              <NavItem key={link.to} title={link.title} to={link.to} />
            ))}
          </NavigationMenuList>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              aria-label={`Theme: ${themeLabel}. Switch theme.`}
              onClick={cycle}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                "bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground",
                "border border-border",
              )}
            >
              <ThemeIcon className="h-4 w-4" />
              <span className="hidden md:inline">{themeLabel}</span>
            </button>

            <button
              type="button"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((prev) => !prev)}
              className={cn(
                "inline-flex items-center justify-center rounded-md px-3 py-2 transition-colors md:hidden",
                "bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground",
                "border border-border",
              )}
            >
              {menuOpen ? (
                <X className="h-4 w-4" />
              ) : (
                <Menu className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {menuOpen && (
          <ul className="flex flex-col md:hidden">
            {NAV_LINKS.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    navigationMenuTriggerStyle(),
                    "w-full justify-start",
                  )}
                >
                  {link.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </NavigationMenu>
  );
}
