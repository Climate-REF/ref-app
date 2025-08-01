import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { Dataset } from "@/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface RecentDatasetsProps {
  datasets: Dataset[];
}

export function RecentDatasets({ datasets }: RecentDatasetsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Datasets</CardTitle>
        <CardDescription>
          The latest datasets ingested by the REF
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {datasets.map((dataset) => (
            <div
              key={dataset.id}
              className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
            >
              <div className="flex flex-col gap-2 overflow-hidden">
                <span className="font-medium text-sm text-nowrap">
                  {dataset.slug}
                </span>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/executions/$groupId" params={{ groupId: "" }}>
                  <span className="sr-only">View details</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="outline" asChild>
            <Link to="/datasets">View All Datasets</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
