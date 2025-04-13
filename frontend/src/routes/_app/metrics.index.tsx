import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSuspenseQuery } from "@tanstack/react-query";

import { metricsListMetricsOptions } from "@/client/@tanstack/react-query.gen";
import { createFileRoute } from "@tanstack/react-router";

const Metrics = () => {
  const { data } = useSuspenseQuery(metricsListMetricsOptions());

  const metrics = data.data;

  return (
    <>
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Metric List</CardTitle>
          <CardDescription>
            Metric longer description goes here{" "}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {metrics.map((metric) => (
              <div key={metric.slug} className="space-y-1">
                <p className="text-sm text-muted-foreground">{metric.name}</p>
                <p className="font-medium">{metric.slug}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export const Route = createFileRoute("/_app/metrics/")({
  component: Metrics,
  staticData: {
    title: "Metrics",
  },
  loader: ({ context: { queryClient } }) => {
    return queryClient.ensureQueryData(metricsListMetricsOptions());
  },
});
