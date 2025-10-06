import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { executionsGetOptions } from "@/client/@tanstack/react-query.gen";
import ExecutionsTable from "@/components/diagnostics/executionsTable.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const ExecutionsTab = () => {
  const { groupId } = Route.useParams();

  const { data } = useSuspenseQuery(
    executionsGetOptions({
      path: { group_id: groupId },
    }),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Executions</CardTitle>
        <CardDescription>
          History of runs for this execution group. Select a row to bring its
          files, values, and logs into view.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ExecutionsTable results={data?.executions} />
      </CardContent>
    </Card>
  );
};

export const Route = createFileRoute("/_app/executions/$groupId/executions")({
  component: ExecutionsTab,
  staticData: {
    title: "Executions",
  },
});
