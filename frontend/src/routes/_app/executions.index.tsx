import { executionsListOptions } from "@/client/@tanstack/react-query.gen";
import { createFileRoute } from "@tanstack/react-router";

const Executions = () => {
  const data = Route.useLoaderData();

  return (
    <>
      {data?.data.map((d) => (
        <div key={d.key}>{d.latest_result?.successful}</div>
      ))}
    </>
  );
};
export const Route = createFileRoute("/_app/executions/")({
  component: Executions,
  staticData: {
    title: "Metric Executions",
  },
  loader: ({ context: { queryClient } }) => {
    return queryClient.ensureQueryData(
      executionsListOptions({ query: { limit: 100 } }),
    );
  },
});
