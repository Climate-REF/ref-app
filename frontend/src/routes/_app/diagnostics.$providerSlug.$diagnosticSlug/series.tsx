import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { DiagnosticValuesPanel } from "@/components/execution/values/valuesPanel";
import { diagnosticValuesSearchSchema } from "@/lib/valuesSearch";

const SeriesValuesTab = () => {
  const params = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  return (
    <DiagnosticValuesPanel
      {...params}
      search={search}
      navigate={navigate}
      valueType="series"
    />
  );
};

export const Route = createFileRoute(
  "/_app/diagnostics/$providerSlug/$diagnosticSlug/series",
)({
  component: SeriesValuesTab,
  validateSearch: diagnosticValuesSearchSchema,
  staticData: {
    title: "Series Values",
  },
});
