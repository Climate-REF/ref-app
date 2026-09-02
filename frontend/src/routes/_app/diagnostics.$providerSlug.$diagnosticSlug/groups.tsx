import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { MipEraScope } from "@/components/charts/mipEraBar";
import ExecutionGroupTable from "@/components/execution/executionGroupTable.tsx";
import { useMipEra } from "@/hooks/useMipEra";
import { mipEraSearchSchema } from "@/lib/mipEras";

// Executions tab as nested route
const Executions = () => {
  const { providerSlug, diagnosticSlug } = Route.useParams();
  const { mip_era } = Route.useSearch();
  const { mipEra, setMipEra } = useMipEra(mip_era);
  return (
    <div className="space-y-4">
      <title>{`Execution Groups (${mipEra}) - ${diagnosticSlug} - Climate-REF`}</title>
      <MipEraScope mipEra={mipEra} setMipEra={setMipEra}>
        <ExecutionGroupTable
          diagnosticSlug={diagnosticSlug}
          providerSlug={providerSlug}
        />
      </MipEraScope>
    </div>
  );
};

export const Route = createFileRoute(
  "/_app/diagnostics/$providerSlug/$diagnosticSlug/groups",
)({
  component: Executions,
  validateSearch: zodValidator(mipEraSearchSchema),
  staticData: {
    title: "Execution Groups",
  },
});
