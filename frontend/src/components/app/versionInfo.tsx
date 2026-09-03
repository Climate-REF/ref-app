import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { utilsAboutOptions } from "@/client/@tanstack/react-query.gen";

const Item = ({ label, value }: { label: string; value: string }) => (
  <span className="inline-flex items-baseline gap-1.5">
    {label}
    <span className="font-mono">{value}</span>
  </span>
);

/**
 * Versions of the deployed components and the freshness of the results being served.
 */
export const VersionInfo = () => {
  const { data } = useQuery(utilsAboutOptions());

  const lastUpdated = data?.last_updated
    ? format(new Date(data.last_updated), "d MMM yyyy")
    : null;

  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-gray-500">
      <Item label="Explorer" value={__APP_VERSION__} />
      {data ? (
        <>
          <Item label="API" value={data.app_version} />
          <Item label="Climate REF" value={data.ref_version} />
        </>
      ) : null}
      {lastUpdated ? (
        <Item label="Results updated" value={lastUpdated} />
      ) : null}
    </div>
  );
};
