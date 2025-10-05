import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_app/diagnostics/$providerSlug/$diagnosticSlug/",
)({
  staticData: {
    title: "Diagnostic Details",
  },
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/diagnostics/$providerSlug/$diagnosticSlug/figures",
      params,
    });
  },
});
