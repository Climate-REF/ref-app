import { Link } from "@tanstack/react-router";
import type { DiagnosticSummary } from "@/client/types.gen";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface DiagnosticCardProps {
  diagnostic: DiagnosticSummary;
}

export function DiagnosticCard({ diagnostic }: DiagnosticCardProps) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-1">
            <CardTitle className="text-lg font-semibold">
              {diagnostic.name}
            </CardTitle>
            <CardDescription className="font-semibold">
              {diagnostic.aft_link ? diagnostic.aft_link.name : ""}
            </CardDescription>
            <Badge variant="secondary">{diagnostic.provider.slug}</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col justify-evenly">
        <div>
          {diagnostic.description && (
            <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
              {diagnostic.description}
            </p>
          )}
        </div>

        <div className="space-y-3">
          {/* AFT Information */}
          {diagnostic.aft_link && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">AFT ID:</span>
              <span className="text-foreground font-medium">
                {diagnostic.aft_link.id}
              </span>
            </div>
          )}

          {/* Metric Values Status */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Scalar Values:</span>
            {diagnostic.has_scalar_values ? (
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                ● Available
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                ○ None
              </span>
            )}
          </div>

          {/* Metric Values Status */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Series Values:</span>
            {diagnostic.has_series_values ? (
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                ● Available
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                ○ None
              </span>
            )}
          </div>
          {/* Total Executions */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Executions:</span>
            <span className="text-foreground">
              {diagnostic.successful_execution_count}/
              {diagnostic.execution_group_count}
            </span>
          </div>
        </div>
      </CardContent>

      <CardFooter>
        <Button asChild className="w-full">
          <Link
            to="/diagnostics/$providerSlug/$diagnosticSlug"
            params={{
              providerSlug: diagnostic.provider.slug,
              diagnosticSlug: diagnostic.slug,
            }}
          >
            View Details
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
