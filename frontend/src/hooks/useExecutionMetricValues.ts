import type { useNavigate } from "@tanstack/react-router";
import { executionsListMetricValues } from "@/client";
import { executionsListMetricValuesOptions } from "@/client/@tanstack/react-query.gen.ts";
import { useMetricValues } from "./useMetricValues";

interface UseExecutionMetricValuesOptions {
  groupId: string;
  search: Record<string, any>;
  valueType: "scalar" | "series";
  navigate: ReturnType<typeof useNavigate>;
}

/**
 * Hook for processing metric values for a given execution.
 */
export function useExecutionMetricValues({
  groupId,
  search,
  valueType,
  navigate,
}: UseExecutionMetricValuesOptions) {
  return useMetricValues({
    pathParams: {
      group_id: groupId,
    },
    search,
    valueType,
    navigate,
    fetchQueryOptions: executionsListMetricValuesOptions,
    fetchDownload: executionsListMetricValues,
    getDownloadFilename: (params, type) =>
      `metric-values-${params.group_id}-${type}.csv`,
  });
}
