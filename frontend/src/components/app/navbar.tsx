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
  return (
    <NavigationMenu className="w-screen justify-start gap-4 px-8 py-4">
      <Link to={"/"} className={cn(navigationMenuTriggerStyle(), "relative")}>
        <div className="flex items-center justify-between">
          <NavbarLogo />
          <h1 className="font-display font-medium text-lg">
            Rapid Evaluation Framework
          </h1>
        </div>
      </Link>
      <NavigationMenuList>
        <NavItem title="Diagnostics" to={"/diagnostics"} />
        <NavItem title="Executions" to={"/executions"} />
        <NavItem title="Data Explorer" to={"/explorer"} />
        <NavItem title="Datasets" to={"/datasets"} />
      </NavigationMenuList>
    </NavigationMenu>
  );
}
