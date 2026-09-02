import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { MipEraBar } from "@/components/charts/mipEraBar";
import { MipEraProvider } from "@/components/charts/mipEraContext";
import ExecutionGroupTable from "@/components/execution/executionGroupTable.tsx";
import { useMipEra } from "@/hooks/useMipEra";
import { mipEraSearchFields } from "@/lib/mipEras";

const groupsSchema = z.object(mipEraSearchFields);

// Executions tab as nested route
const Executions = () => {
  const { providerSlug, diagnosticSlug } = Route.useParams();
  const { mip_era } = Route.useSearch();
  const { mipEra, setMipEra } = useMipEra(mip_era);
  return (
    <div className="space-y-4">
      <title>{`Execution Groups (${mipEra}) - ${diagnosticSlug} - Climate-REF`}</title>
      <MipEraBar mipEra={mipEra} onChange={setMipEra} />
      <MipEraProvider mipEra={mipEra} setMipEra={setMipEra}>
        <ExecutionGroupTable
          diagnosticSlug={diagnosticSlug}
          providerSlug={providerSlug}
        />
      </MipEraProvider>
    </div>
  );
};

export const Route = createFileRoute(
  "/_app/diagnostics/$providerSlug/$diagnosticSlug/groups",
)({
  component: Executions,
  validateSearch: zodValidator(groupsSchema),
  staticData: {
    title: "Execution Groups",
  },
});
