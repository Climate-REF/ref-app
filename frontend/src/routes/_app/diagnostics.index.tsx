import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSuspenseQuery } from "@tanstack/react-query";

import { diagnosticsListOptions } from "@/client/@tanstack/react-query.gen";
import { createFileRoute } from "@tanstack/react-router";

const Metrics = () => {
  const { data } = useSuspenseQuery(diagnosticsListOptions());

  const diagnostics = data.data;

  return (
    <>
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Diagnostic List</CardTitle>
          <CardDescription>
            Metric longer description goes here{" "}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {diagnostics.map((diagnostic) => (
              <div key={diagnostic.slug} className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  {diagnostic.name}
                </p>
                <p className="font-medium">{diagnostic.slug}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export const Route = createFileRoute("/_app/diagnostics/")({
  component: Metrics,
  staticData: {
    title: "Diagnostics",
  },
  loader: ({ context: { queryClient } }) => {
    return queryClient.ensureQueryData(diagnosticsListOptions());
  },
});
