import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_app/diagnostics/$providerSlug/$diagnosticSlug/",
)({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/diagnostics/$providerSlug/$diagnosticSlug/values",
      params,
    });
  },
});
