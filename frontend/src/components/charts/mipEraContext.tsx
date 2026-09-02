import { createContext, type ReactNode, useContext } from "react";
import type { MipEra } from "@/lib/mipEras";

export interface MipEraSelection {
  mipEra: MipEra;
  setMipEra: (era: MipEra) => void;
}

/** The MIP era a page has selected, or null where the page offers no selector. */
const SelectedMipEraContext = createContext<MipEraSelection | null>(null);

export function MipEraProvider({
  mipEra,
  setMipEra,
  children,
}: MipEraSelection & { children: ReactNode }) {
  return (
    <SelectedMipEraContext.Provider value={{ mipEra, setMipEra }}>
      {children}
    </SelectedMipEraContext.Provider>
  );
}

export function useSelectedMipEra(): MipEra | null {
  return useContext(SelectedMipEraContext)?.mipEra ?? null;
}

export function useMipEraSelection(): MipEraSelection | null {
  return useContext(SelectedMipEraContext);
}
