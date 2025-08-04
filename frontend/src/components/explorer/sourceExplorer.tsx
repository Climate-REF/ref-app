"use client";

// import { useSuspenseQuery } from "@tanstack/react-query";
// import { diagnosticsFacetsOptions } from "@/client/@tanstack/react-query.gen";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Route } from "@/routes/_app/explorer/sources";
import { SourceExplorerContent } from "./sourceExplorerContent";
import { SourceSelect } from "./sourceSelect.tsx";

export const SourceExplorer = () => {
  const { sourceId } = Route.useSearch();
  // const { data } = useSuspenseQuery(diagnosticsFacetsOptions());

  return (
    <div className="space-y-4">
      <Card>
        <CardContent>
          <div className="space-y-2">
            <label htmlFor="source-id-select" className="text-sm font-medium">
              Source ID
            </label>
            <p className="text-xs text-muted-foreground">
              Choose a model or dataset source. This will scope the explorer to
              results for the selected source.
            </p>
            <SourceSelect
              options={[
                "ACCESS-CM2",
                "ACCESS-ESM1-5",
                "BCC-CSM2-MR",
                "BCC-ESM1",
                "CAMS-CSM1-0",
                "CAS-ESM2-0",
                "CESM2",
                "CESM2-FV2",
                "CESM2-WACCM",
                "CESM2-WACCM-FV2",
                "CIESM",
                "CMCC-CM2-HR4",
                "CMCC-CM2-SR5",
                "CMCC-ESM2",
                "CNRM-CM6-1",
                "CNRM-CM6-1-HR",
                "CNRM-ESM2-1",
                "CanESM5",
                "CanESM5-1",
                "CanESM5-CanOE",
                "E3SM-1-0",
                "E3SM-1-1",
                "E3SM-1-1-ECA",
                "E3SM-2-0",
                "E3SM-2-0-NARRM",
                "E3SM-2-1",
                "EC-Earth3-AerChem",
                "EC-Earth3-CC",
                "EC-Earth3-Veg",
                "EC-Earth3-Veg-LR",
                "FGOALS-f3-L",
                "FGOALS-g3",
                "FIO-ESM-2-0",
                "GFDL-CM4",
                "GFDL-ESM4",
                "GISS-E2-1-G",
                "GISS-E2-1-G-CC",
                "GISS-E2-1-H",
                "GISS-E2-2-G",
                "GISS-E2-2-H",
                "GISS-E3-G",
                "IITM-ESM",
                "INM-CM4-8",
                "INM-CM5-0",
                "IPSL-CM5A2-INCA",
                "IPSL-CM6A-LR",
                "IPSL-CM6A-LR-INCA",
                "IPSL-CM6A-MR1",
                "KACE-1-0-G",
                "MCM-UA-1-0",
                "MIROC-ES2H",
                "MIROC-ES2L",
                "MIROC6",
                "MPI-ESM-1-2-HAM",
                "MPI-ESM1-2-HR",
                "MPI-ESM1-2-LR",
                "MRI-ESM2-0",
                "NESM3",
                "NorCPM1",
                "NorESM2-MM",
                "SAM0-UNICON",
                "TaiESM1",
                "UKESM1-0-LL",
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {sourceId ? (
        <SourceExplorerContent sourceId={sourceId} />
      ) : (
        <div className="text-center text-sm text-muted-foreground">
          Please select a model to continue
        </div>
      )}
    </div>
  );
};
