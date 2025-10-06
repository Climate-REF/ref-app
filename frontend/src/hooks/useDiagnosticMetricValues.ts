import type { useNavigate } from "@tanstack/react-router";
import { diagnosticsListMetricValues } from "@/client";
import { diagnosticsListMetricValuesOptions } from "@/client/@tanstack/react-query.gen.ts";

import { useMetricValues } from "./useMetricValues";

interface UseDiagnosticMetricValuesOptions {
  providerSlug: string;
  diagnosticSlug: string;
  search: Record<string, any>;
  valueType: "scalar" | "series";
  navigate: ReturnType<typeof useNavigate>;
}

export function useDiagnosticMetricValues({
  providerSlug,
  diagnosticSlug,
  search,
  valueType,
  navigate,
}: UseDiagnosticMetricValuesOptions) {
  return useMetricValues({
    pathParams: {
      provider_slug: providerSlug,
      diagnostic_slug: diagnosticSlug,
    },
    search,
    valueType,
    navigate,
    fetchQueryOptions: diagnosticsListMetricValuesOptions,
    fetchDownload: diagnosticsListMetricValues,
    getDownloadFilename: (params, type) =>
      `metric-values-${params.provider_slug}-${params.diagnostic_slug}-${type}.csv`,
  });
}
