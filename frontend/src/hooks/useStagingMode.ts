import { useQuery } from "@tanstack/react-query";
import { utilsAboutOptions } from "@/client/@tanstack/react-query.gen";
import { getDefaultApiEndpoint } from "@/lib/apiEndpoint";

/**
 * Whether the API being read is a staging deployment.
 *
 * Staging shows every value it holds, including the sparse results a production site withholds,
 * so the two must never be mistaken for each other.
 */
export function useStagingMode(): boolean {
  const { data } = useQuery(utilsAboutOptions());
  return data?.environment === "staging";
}

/**
 * Whether this deployment of the dashboard is the staging one.
 *
 * Asks the API the dashboard is deployed with, not the one the visitor picked,
 * so switching endpoints doesn't change the answer.
 */
export function useStagingDashboard(): boolean {
  const { data } = useQuery(
    utilsAboutOptions({ baseUrl: getDefaultApiEndpoint() }),
  );
  return data?.environment === "staging";
}
