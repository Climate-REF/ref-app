import { useQuery } from "@tanstack/react-query";
import { utilsAboutOptions } from "@/client/@tanstack/react-query.gen";

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
