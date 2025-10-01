import { Link } from "@tanstack/react-router";
import { MessageCircleWarning } from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

interface DiagnosticCardProps {
  diagnostic: DiagnosticSummary;
  note?: string;
  noteURL?: string;
}

export function DiagnosticCard({
  diagnostic,
  note,
  noteURL,
}: DiagnosticCardProps) {
  console.log("Rendering DiagnosticCard for", diagnostic.slug, note, noteURL);
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
              <span className="text-muted-foreground">CMIP7 AFT ID:</span>
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
              {note && (
                <Tooltip>
                  <TooltipTrigger>
                    <MessageCircleWarning className="ml-2 h-4 w-4 text-muted-foreground text-red-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{note}</p>
                    {noteURL && (
                      <a
                        href={noteURL}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Learn more
                      </a>
                    )}
                  </TooltipContent>
                </Tooltip>
              )}
            </span>
          </div>

          {/* Reference Datasets */}
          {diagnostic.reference_datasets &&
            diagnostic.reference_datasets.length > 0 && (
              <div className="flex flex-col gap-2 text-sm">
                <span className="text-muted-foreground">
                  Reference Datasets:
                </span>
                <div className="flex flex-wrap gap-1">
                  {diagnostic.reference_datasets.slice(0, 3).map((ref) => (
                    <Tooltip key={ref.slug}>
                      <TooltipTrigger asChild>
                        <Badge
                          variant="outline"
                          className="text-xs cursor-help"
                        >
                          {ref.slug}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-sm space-y-1">
                          <div className="font-semibold">{ref.slug}</div>
                          {ref.description && (
                            <div className="text-muted-foreground">
                              {ref.description}
                            </div>
                          )}
                          <div className="text-xs mt-1">Type: {ref.type}</div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                  {diagnostic.reference_datasets.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{diagnostic.reference_datasets.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
        </div>

        {/* Tags */}
        {diagnostic.tags && diagnostic.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {diagnostic.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
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
