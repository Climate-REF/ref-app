import { createFileRoute } from "@tanstack/react-router";
import { executionsListOptions } from "@/client/@tanstack/react-query.gen";

const Executions = () => {
  const { data } = Route.useLoaderData();
  return (
    <>
      {data.map((d) => (
        <div key={`${d.diagnostic.id}-${d.key}`}>{d.latest_execution?.id}</div>
      ))}
    </>
  );
};
export const Route = createFileRoute("/_app/executions/")({
  component: Executions,
  staticData: {
    title: "Executions",
  },
  loader: ({ context: { queryClient } }) => {
    return queryClient.ensureQueryData(
      executionsListOptions({ query: { limit: 10 } }),
    );
  },
});
