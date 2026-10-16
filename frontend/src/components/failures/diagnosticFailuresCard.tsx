import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { ChevronRight, SquareArrowOutUpRight } from "lucide-react";
import { useState } from "react";
import type { ExecutionGroup } from "@/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type DiagnosticFailures,
  failureSummary,
  failuresAnchor,
} from "@/lib/failures";
import { HealthDot } from "./health";
import { LogTail } from "./logTail";

/** Failed groups listed before the rest are hidden behind "Show all". */
const INITIAL_GROUPS = 10;

function FailedGroupItem({ group }: { group: ExecutionGroup }) {
  // Executions are oldest first, so this is the latest execution, which failed
  const execution = group.executions.at(-1);
  if (!execution) {
    return null;
  }

  return (
    <Collapsible asChild>
      <li className="rounded-md border">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <CollapsibleTrigger className="group flex min-w-0 flex-1 items-center gap-2 rounded-sm text-left text-sm hover:underline">
            <ChevronRight className="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-90" />
            <span className="truncate font-mono" title={group.key}>
              {group.key}
            </span>
          </CollapsibleTrigger>
          <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
            {format(new Date(execution.updated_at), "yyyy-MM-dd HH:mm")}
          </span>
          <Link
            to="/executions/$groupId/logs"
            params={{ groupId: group.id.toString() }}
            aria-label="Open execution group"
            title="Open execution group"
            className="shrink-0"
          >
            <SquareArrowOutUpRight className="size-4 text-blue-500 hover:text-blue-300 dark:text-blue-400 dark:hover:text-blue-300" />
          </Link>
        </div>
        <CollapsibleContent className="px-2 pb-2">
          <LogTail groupId={group.id} executionId={execution.id} />
        </CollapsibleContent>
      </li>
    </Collapsible>
  );
}

/** A diagnostic with failing execution groups, listing each with the end of its log. */
export function DiagnosticFailuresCard({
  failures,
}: {
  failures: DiagnosticFailures;
}) {
  const [showAll, setShowAll] = useState(false);
  const { diagnostic } = failures;
  const groups = failures.failedGroups;
  const shown = showAll ? groups : groups.slice(0, INITIAL_GROUPS);
  const unfinished = [
    failures.running > 0 && `${failures.running} running`,
    failures.notStarted > 0 && `${failures.notStarted} not started`,
  ].filter(Boolean);

  return (
    <Card id={failuresAnchor(diagnostic)} className="scroll-mt-4">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <HealthDot health={failures.health} />
          <Link
            to="/diagnostics/$providerSlug/$diagnosticSlug"
            params={{
              providerSlug: diagnostic.provider.slug,
              diagnosticSlug: diagnostic.slug,
            }}
            className="hover:underline"
          >
            {diagnostic.name}
          </Link>
          <Badge variant="outline">{diagnostic.provider.name}</Badge>
        </CardTitle>
        <CardDescription>
          {failureSummary(failures)}
          {unfinished.length > 0 && ` (${unfinished.join(", ")})`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <ul className="space-y-1">
          {shown.map((group) => (
            <FailedGroupItem key={group.id} group={group} />
          ))}
        </ul>
        {groups.length > INITIAL_GROUPS && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll((prev) => !prev)}
          >
            {showAll
              ? "Show fewer"
              : `Show all ${groups.length} failed execution groups`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/** Placeholder for a failing diagnostic's card while the failures load. */
export function DiagnosticFailuresCardSkeleton() {
  return (
    <Card>
      <CardHeader className="space-y-2">
        <Skeleton className="h-5 w-72 max-w-full" />
        <Skeleton className="h-4 w-56 max-w-full" />
      </CardHeader>
      <CardContent className="space-y-1">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </CardContent>
    </Card>
  );
}
