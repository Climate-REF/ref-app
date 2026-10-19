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
import { describeFailureReason, failureReasonOf } from "@/lib/failureReasons";
import {
  type DiagnosticFailures,
  type FailureFilters,
  failedRunRange,
  failureSummary,
  failuresAnchor,
  groupFacets,
  groupsToShow,
  lastSucceededAt,
  reasonBreakdown,
} from "@/lib/failures";
import { FailureReasonBadge } from "./failureReasonBadge";
import { HealthDot } from "./health";
import { LogExcerpt } from "./logExcerpt";

const day = (date: string) => format(new Date(date), "d MMM yyyy");

/** When the failed runs happened, e.g. "Failed runs between 4 Sep 2026 and 12 Oct 2026" */
function failedRunsText(failures: DiagnosticFailures): string | null {
  const range = failedRunRange(failures);
  if (!range) {
    return null;
  }
  const [first, last] = [day(range.first), day(range.last)];
  return first === last
    ? `Failed on ${first}`
    : `Failed runs between ${first} and ${last}`;
}

/** Failed groups listed before the rest are hidden behind "Show all". */
const INITIAL_GROUPS = 10;

function FailedGroupItem({ group }: { group: ExecutionGroup }) {
  // Executions are oldest first, so this is the latest execution, which failed
  const execution = group.executions.at(-1);
  if (!execution) {
    return null;
  }
  const { model, experiment, member } = groupFacets(group);
  const succeeded = lastSucceededAt(group);

  return (
    <Collapsible asChild>
      <li className="rounded-md border">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <CollapsibleTrigger className="group flex min-w-0 flex-1 items-start gap-2 rounded-sm text-left text-sm">
            <ChevronRight className="mt-0.5 size-4 shrink-0 transition-transform group-data-[state=open]:rotate-90" />
            <span className="min-w-0">
              <span
                className="block truncate font-mono group-hover:underline"
                title={group.key}
              >
                {group.key}
              </span>
              <span className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                {model && <span title="Model">{model}</span>}
                {experiment && <span title="Experiment">{experiment}</span>}
                {member && <span title="Ensemble member">{member}</span>}
                <span title="When this execution group last succeeded, before the failure">
                  {succeeded
                    ? `last succeeded ${day(succeeded)}`
                    : "never succeeded"}
                </span>
              </span>
            </span>
          </CollapsibleTrigger>
          <FailureReasonBadge
            reason={failureReasonOf(group)}
            className="shrink-0"
          />
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
          <LogExcerpt groupId={group.id} executionId={execution.id} />
        </CollapsibleContent>
      </li>
    </Collapsible>
  );
}

/** A diagnostic with failing execution groups, listing each with what its log says about the failure. */
export function DiagnosticFailuresCard({
  failures,
  filters = {},
}: {
  failures: DiagnosticFailures;
  /** Only list the failed groups matching these */
  filters?: FailureFilters;
}) {
  const [showAll, setShowAll] = useState(false);
  const { diagnostic } = failures;
  const groups = groupsToShow(failures, filters);
  const reasons = reasonBreakdown(failures.failedGroups);
  const filtered = filters.model !== undefined || filters.reason !== undefined;
  const when = failedRunsText(failures);
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
        <CardDescription className="space-y-0.5">
          <p>
            {failureSummary(failures)}
            {unfinished.length > 0 && ` (${unfinished.join(", ")})`}
          </p>
          {when && <p>{when}</p>}
          <p className="flex flex-wrap items-center gap-1">
            {reasons.map(({ reason, groups: count }) => (
              <span key={reason} className="inline-flex items-center gap-1">
                <FailureReasonBadge reason={reason} />
                <span className="text-xs">{count}</span>
              </span>
            ))}
          </p>
          {filtered && (
            <p>
              Showing {groups.length} failed{" "}
              {groups.length === 1 ? "group" : "groups"}
              {filters.model && ` of ${filters.model}`}
              {filters.reason &&
                ` with ${describeFailureReason(filters.reason).label.toLowerCase()}`}
            </p>
          )}
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
