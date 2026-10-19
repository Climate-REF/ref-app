import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ExecutionValuesPanel } from "@/components/execution/values/valuesPanel";
import { executionValuesSearchSchema } from "@/lib/valuesSearch";

const SeriesValuesTab = () => {
  const params = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  return (
    <ExecutionValuesPanel
      {...params}
      search={search}
      navigate={navigate}
      valueType="series"
    />
  );
};

export const Route = createFileRoute("/_app/executions/$groupId/series")({
  component: SeriesValuesTab,
  validateSearch: executionValuesSearchSchema,
  staticData: {
    title: "Series Values",
  },
});
