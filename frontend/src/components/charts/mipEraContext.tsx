import { createContext, type ReactNode, useContext } from "react";
import type { MipEra } from "@/lib/mipEras";

/** The MIP era a page has selected, or null where the page offers no selector. */
const SelectedMipEraContext = createContext<MipEra | null>(null);

export function MipEraProvider({
  mipEra,
  children,
}: {
  mipEra: MipEra | null;
  children: ReactNode;
}) {
  return (
    <SelectedMipEraContext.Provider value={mipEra}>
      {children}
    </SelectedMipEraContext.Provider>
  );
}

export function useSelectedMipEra(): MipEra | null {
  return useContext(SelectedMipEraContext);
}
