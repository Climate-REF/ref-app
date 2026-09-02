import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_MIP_ERA,
  type MipEra,
  readStoredMipEra,
  storeMipEra,
} from "@/lib/mipEras";

/**
 * Resolve the MIP era a page shows, and let the page change it.
 *
 * The URL wins when it names an era, otherwise the visitor's last pick applies.
 * Whatever era the page ends up showing becomes the pick the next page opens in.
 */
export function useMipEra(searchEra: MipEra | undefined) {
  const navigate = useNavigate();
  const [stored] = useState(readStoredMipEra);
  const mipEra = searchEra ?? stored ?? DEFAULT_MIP_ERA;

  useEffect(() => {
    storeMipEra(mipEra);
  }, [mipEra]);

  const setMipEra = useCallback(
    (next: MipEra) => {
      navigate({
        to: ".",
        search: (prev: Record<string, unknown>) => ({ ...prev, mip_era: next }),
      });
    },
    [navigate],
  );

  return { mipEra, setMipEra };
}
