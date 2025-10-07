import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Link, LinkExternal } from "@/components/ui/link";
import { Disclaimer } from "./disclaimer";

const VERSION = "v1";
const STORAGE_KEY = `climate-ref-welcome-seen-${VERSION}`;

export function WelcomeModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (!seen) {
        setOpen(true);
      }
    } catch (_e) {
      // localStorage may be unavailable in some environments; fail silently
    }
  }, []);

  const acknowledge = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch (_e) {
      // ignore
    }
    setOpen(false);
  };

  const closeWithoutSaving = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => setOpen(o)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold mb-4 flex flex-row items-center justify-center gap-4">
            Welcome to the Climate-REF
            <img
              src="/logos/logo_cmip_ref.png"
              alt="CMIP Rapid Evaluation Framework"
              className="h-10 w-12"
            />
          </DialogTitle>
          <DialogDescription>
            Climate-REF (Rapid Evaluation Framework) provides a consistent,
            reproducible platform for evaluating climate model outputs against
            reference datasets, visualising results, and comparing performance
            across models and versions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This interface exposes pre-computed diagnostics, execution groups,
            and visualisations produced by 4 diagnostic providers (ESMValTool,
            ILAMB/IOMB and PMP). The Climate-REF can also be run locally or
            deployed on your own infrastructure if you wish to evaluate data not
            yet published on ESGF; see the{" "}
            <LinkExternal href="https://climate-ref.readthedocs.io/en/latest/">
              documentation
            </LinkExternal>{" "}
            for more information.
          </p>
          <p className="text-sm text-muted-foreground">
            The results presented here focus on CMIP6 datasets, but this will be
            updated as new CMIP7 datasets become available We have some example
            figures available in the <Link to="/explorer">Data Explorer</Link>{" "}
            or you can browse the full{" "}
            <Link to="/diagnostics">Diagnostic Catalog</Link>.
          </p>

          <section className="space-y-4">
            <h3 className="font-semibold mb-2">Disclaimer</h3>
            <Disclaimer />
          </section>
        </div>

        <DialogFooter className="mt-8">
          <div className="flex w-full gap-2">
            <Button onClick={acknowledge} className="flex-1">
              Accept — Don't show again
            </Button>
            <Button variant="outline" onClick={closeWithoutSaving}>
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
