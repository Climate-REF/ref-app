import { createFileRoute } from "@tanstack/react-router";
import ExecutionGroupTable from "@/components/execution/executionGroupTable.tsx";

// Executions tab as nested route
export const Executions = () => {
  const { providerSlug, diagnosticSlug } = Route.useParams();
  return (
    <div className="space-y-4">
      <ExecutionGroupTable
        diagnosticSlug={diagnosticSlug}
        providerSlug={providerSlug}
      />
    </div>
  );
};

export const Route = createFileRoute(
  "/_app/diagnostics/$providerSlug/$diagnosticSlug/groups",
)({
  component: Executions,
});
