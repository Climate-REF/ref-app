import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { DiagnosticValuesPanel } from "@/components/execution/values/valuesPanel";
import { diagnosticValuesSearchSchema } from "@/lib/valuesSearch";

const ScalarsValuesTab = () => {
  const params = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  return (
    <DiagnosticValuesPanel
      {...params}
      search={search}
      navigate={navigate}
      valueType="scalar"
    />
  );
};

export const Route = createFileRoute(
  "/_app/diagnostics/$providerSlug/$diagnosticSlug/scalars",
)({
  component: ScalarsValuesTab,
  validateSearch: diagnosticValuesSearchSchema,
  staticData: {
    title: "Scalar Values",
  },
});
