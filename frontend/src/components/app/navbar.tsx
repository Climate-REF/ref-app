"use client";

import { Link } from "@tanstack/react-router";
import { Moon, Sun } from "lucide-react";
import { NavbarLogo } from "@/components/app/navbarLogo.tsx";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils.ts";

function NavItem({ title, to }: { title: string; to: string }) {
  return (
    <NavigationMenuItem asChild>
      <Link to={to} className={navigationMenuTriggerStyle()}>
        {title}
      </Link>
    </NavigationMenuItem>
  );
}

export function Navbar() {
  const { theme, toggle } = useTheme();

  return (
    <NavigationMenu className="w-screen px-8 py-4">
      <div className="flex w-full items-center gap-4">
        <Link to={"/"} className={cn("relative")}>
          <NavbarLogo />
        </Link>

        <NavigationMenuList className="flex">
          <NavItem title="Diagnostics" to={"/diagnostics"} />
          <NavItem title="Data Explorer" to={"/explorer"} />
          <NavItem title="Executions" to={"/executions"} />
          <NavItem title="Datasets" to={"/datasets"} />
        </NavigationMenuList>

        <div className="ml-auto">
          <button
            type="button"
            aria-label="Toggle theme"
            onClick={toggle}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              "bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground",
              "border border-border",
            )}
          >
            {theme === "dark" ? (
              <>
                <Sun className="h-4 w-4" />
                <span className="hidden md:inline">Light</span>
              </>
            ) : (
              <>
                <Moon className="h-4 w-4" />
                <span className="hidden md:inline">Dark</span>
              </>
            )}
          </button>
        </div>
      </div>
    </NavigationMenu>
  );
}
