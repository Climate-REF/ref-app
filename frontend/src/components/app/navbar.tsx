"use client";

import { NavbarLogo } from "@/components/app/navbarLogo.tsx";
import { Link } from "@tanstack/react-router";

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";

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
    <NavigationMenu className="w-screen justify-start gap-4 px-8">
      <div className="flex items-center justify-between">
        <NavbarLogo />
        <h1 className="font-display font-bold text-xl ">
          Rapid Evaluation Framework
        </h1>
      </div>
      <NavigationMenuList>
        <NavItem title="Home" to={"/"} />
        <NavItem title="Diagnostics" to={"/diagnostics"} />
        <NavItem title="By Source" to={"/source"} />
        <NavItem title="By Dataset" to={"/datasets"} />
      </NavigationMenuList>
    </NavigationMenu>
  );
}
