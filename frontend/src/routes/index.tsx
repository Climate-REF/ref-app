import { executionsListOptions } from "@/client/@tanstack/react-query.gen.ts";
import { RecentExecutions } from "@/components/dashboard/recentExecutions.tsx";
import { Button } from "@/components/ui/button.tsx";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { createFileRoute } from "@tanstack/react-router";

const Dashboard = () => {
  const recentExecutions = useQuery(
    executionsListOptions({ query: { limit: 10 } }),
  );
  return (
    <>
      <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950">
        <div className="container px-4 md:px-6">
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
        <div className="grid auto-rows-min gap-4 md:grid-cols-3">
          <div className="aspect-video rounded-xl bg-muted/50" />
          <div className="aspect-video rounded-xl bg-muted/50" />
          <div className="aspect-video rounded-xl bg-muted/50" />
        </div>
        <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min" />
      </div>
    </>
  );
};

export const Route = createFileRoute("/")({
  component: Dashboard,
});
