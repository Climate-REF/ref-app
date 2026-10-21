import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ExecutionValuesPanel } from "@/components/execution/values/valuesPanel";
import { executionValuesSearchSchema } from "@/lib/valuesSearch";

const ScalarValuesTab = () => {
  const params = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  return (
    <ExecutionValuesPanel
      {...params}
      search={search}
      navigate={navigate}
      valueType="scalar"
    />
  );
};

export const Route = createFileRoute("/_app/executions/$groupId/scalar")({
  component: ScalarValuesTab,
  validateSearch: executionValuesSearchSchema,
  staticData: {
    title: "Scalar Values",
  },
});
