import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import {
  DEFAULT_MIP_ERA,
  type MipEra,
  readStoredMipEra,
  storeMipEra,
} from "@/lib/mipEras";

/**
 * Resolve the MIP era a page shows, and let the page change it.
 *
 * The URL wins when it names an era. Otherwise the visitor's last pick applies, so moving
 * between pages keeps the era they were looking at. Changing the era rewrites the URL and
 * remembers the pick.
 */
export function useMipEra(searchEra: MipEra | undefined) {
  const navigate = useNavigate();
  const mipEra = searchEra ?? readStoredMipEra() ?? DEFAULT_MIP_ERA;

  const setMipEra = useCallback(
    (next: MipEra) => {
      storeMipEra(next);
      navigate({
        to: ".",
        search: (prev: Record<string, unknown>) => ({ ...prev, mip_era: next }),
      });
    },
    [navigate],
  );

  return { mipEra, setMipEra };
}
