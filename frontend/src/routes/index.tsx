import { MDXProvider } from "@mdx-js/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import {
  datasetsListOptions,
  executionsListRecentExecutionGroupsOptions,
} from "@/client/@tanstack/react-query.gen.ts";
import { ExecutionStats } from "@/components/dashboard/executionStats";
import { RecentDatasets } from "@/components/dashboard/recentDatasets";
import { RecentExecutions } from "@/components/dashboard/recentExecutions";
import { Button } from "@/components/ui/button";
import DataHealthWarning from "@/content/data-health-warning.mdx";
import IndexContent from "@/content/index.mdx";

const CTA = () => {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <Button asChild size="lg">
        <a href="/explorer">
          Explore Data <ArrowRight className="ml-2 h-4 w-4" />
        </a>
      </Button>
      <Button variant="outline" asChild size="lg">
        <Link to="/content/introduction">Introduction</Link>
      </Button>
      <Button variant="outline" asChild size="lg">
        <Link to="/content/about">Learn More</Link>
      </Button>
    </div>
  );
};

const Dashboard = () => {
  const recentExecutions = useQuery(
    executionsListRecentExecutionGroupsOptions({ query: { limit: 5 } }),
  );
  const recentDatasets = useQuery(
    datasetsListOptions({ query: { limit: 10 } }),
  );
  return (
    <div>
      <div className="space-y-8">
        <section className="w-full py-12 md:py-24 lg:py-28 bg-gradient-to-b from-icyBlue to-white dark:from-gray-900 dark:to-gray-950">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl">
                  CMIP7 Assessment Fast Track
                  <br /> Rapid Evaluation Framework
                </h1>
                <p className="mx-auto max-w-8xl text-gray-500 md:text-xl dark:text-gray-400 mt-6">
                  Systematic and comprehensive evaluation of climate models
                  through comparison with observational data
                </p>
              </div>
              <CTA />
            </div>
          </div>
        </section>
        <MDXProvider>
          <article className="prose prose-slate dark:prose-invert flex flex-1 flex-col gap-4 container mx-auto mt-8">
            <IndexContent />
          </article>
        </MDXProvider>
        <div className="prose prose-slate dark:prose-invert flex flex-1 flex-col gap-4 container mx-auto mt-8">
          <DataHealthWarning />
        </div>
        <div className="flex justify-center">
          <CTA />
        </div>
        <div className="container mx-auto space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <ExecutionStats />
          </div>

          <div className="grid lg:grid-cols-2 grid-cols-1 gap-8 items-stretch">
            <div className="col-span-1 h-full">
              <RecentExecutions
                executions={recentExecutions.data?.data ?? []}
              />
            </div>

            <div className="col-span-1 h-full">
              <RecentDatasets datasets={recentDatasets.data?.data ?? []} />
            </div>
          </div>
        </div>{" "}
      </div>
    </div>
  );
};

export const Route = createFileRoute("/")({
  component: Dashboard,
  staticData: {
    title: "Dashboard",
  },
});
