import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import {
  datasetsListOptions,
  executionsListOptions,
} from "@/client/@tanstack/react-query.gen.ts";
import { RecentDatasets } from "@/components/dashboard/recentDatasets.tsx";
import { RecentExecutions } from "@/components/dashboard/recentExecutions.tsx";
import { Button } from "@/components/ui/button.tsx";

const Dashboard = () => {
  const recentExecutions = useQuery(
    executionsListOptions({ query: { limit: 10 } }),
  );
  const recentDatasets = useQuery(
    datasetsListOptions({ query: { limit: 10 } }),
  );
  return (
    <>
      <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl">
                CMIP Assessment Fast Track Rapid Evaluation Framework
              </h1>
              <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                Systematic and comprehensive evaluation of climate models
                through comparison with observational data
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg">
                <a href="/explorer">
                  Explore Data <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button variant="outline" asChild size="lg">
                <Link to="/content/about">Learn More</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="grid md:grid-cols-2 grid-cols-1 gap-4 p-4">
        <div className="col-span-1">
          <RecentExecutions executions={recentExecutions.data?.data ?? []} />
        </div>

        <div className="col-span-1">
          <RecentDatasets datasets={recentDatasets.data?.data ?? []} />
        </div>
      </div>
    </>
  );
};

export const Route = createFileRoute("/")({
  component: Dashboard,
});
