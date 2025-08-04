"use client";

import { Link } from "@tanstack/react-router";
import { NavbarLogo } from "@/components/app/navbarLogo.tsx";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils.ts";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

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
        <Link to={"/"} className={cn(navigationMenuTriggerStyle(), "relative")}>
          <div className="flex items-center justify-between">
            <NavbarLogo />
            <h1 className="font-display font-medium text-lg">
              Rapid Evaluation Framework
            </h1>
          </div>
        </Link>

        <NavigationMenuList className="flex">
          <NavItem title="Diagnostics" to={"/diagnostics"} />
          <NavItem title="Executions" to={"/executions"} />
          <NavItem title="Data Explorer" to={"/explorer"} />
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
              "border border-border"
            )}
          >
            {theme === "dark" ? (
              <>
                <Sun className="h-4 w-4" />
                Light
              </>
            ) : (
              <>
                <Moon className="h-4 w-4" />
                Dark
              </>
            )}
          </button>
        </div>
      </div>
    </NavigationMenu>
  );
}
