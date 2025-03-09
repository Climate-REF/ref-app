import PageHeader from "@/components/pageHeader.tsx";
import { useQuery } from "@tanstack/react-query";

import { executionsListExecutionsOptions } from "@/client/@tanstack/react-query.gen";

const Executions = () => {
  const { data } = useQuery(
    executionsListExecutionsOptions({ query: { limit: 100 } }),
  );

  return (
    <>
      <PageHeader title="Metric Executions" />
      <div className="flex flex-1 flex-col gap-4 p-4">
        {data?.data.map((d) => (
          <div>{d.latest_result?.successful}</div>
        ))}
      </div>
    </>
  );
};

export default Executions;
