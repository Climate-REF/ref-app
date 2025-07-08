"use client";

import { DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";

interface FacetSelectProps
  extends ComponentProps<typeof DropdownMenuRadioGroup> {
  facetValues: string[];
}

export function FacetSelect({
  children,
  value,
  facetValues,
  onValueChange,
}: FacetSelectProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="hidden h-8 lg:flex">
          {children}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[150px]">
        <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
          {facetValues.map((value) => (
            <DropdownMenuRadioItem key={value} value={value}>
              {value}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
