import { createFileRoute } from "@tanstack/react-router";
import { ApiEndpointSelector } from "@/components/settings/apiEndpointSelector";

export const Route = createFileRoute("/_app/settings/api-endpoint")({
  component: ApiEndpointSelector,
  staticData: {
    title: "API Endpoint Settings",
  },
});
