import { createFileRoute, redirect } from "@tanstack/react-router";
import { diagnosticsListMetricValues } from "@/client";

export const Route = createFileRoute(
  "/_app/diagnostics/$providerSlug/$diagnosticSlug/",
)({
  beforeLoad: async ({ params }) => {
    try {
      const response = await diagnosticsListMetricValues({
        path: {
          provider_slug: params.providerSlug,
          diagnostic_slug: params.diagnosticSlug,
        },
        query: {
          type: "all",
        },
      });

      // Check if there are metric values; default to figures if none or error
      const hasValues =
        response.data &&
        (response.data as any).data &&
        (response.data as any).data.length > 0;

      throw redirect({
        to: hasValues
          ? "/diagnostics/$providerSlug/$diagnosticSlug/values"
          : "/diagnostics/$providerSlug/$diagnosticSlug/figures",
        params,
      });
    } catch (error) {
      // On error, default to figures to avoid landing users on an empty Values view
      throw redirect({
        to: "/diagnostics/$providerSlug/$diagnosticSlug/figures",
        params,
      });
    }
  },
});
