import { useQuery } from "@tanstack/react-query";
import { executionsExecutionLogsOptions } from "@/client/@tanstack/react-query.gen";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiErrorMessage } from "@/lib/apiError";
import { cn } from "@/lib/utils";

const LOG_TAIL_LINES = 20;

/** Loguru marks each line with its level, e.g. "2025-01-01 12:00:00.000 | ERROR | ..." */
const ERROR_LINE = /\|\s*(ERROR|CRITICAL)\s*\|/;

/**
 * Split the end of a log, fetched with one line more than `limit`, into the lines to show
 *
 * Receiving more than `limit` lines means the log is longer than what is shown.
 */
export function logTailLines(
  text: string,
  limit: number,
): { lines: string[]; truncated: boolean } {
  const received = text.split("\n");
  // Drop the empty string after the final line ending
  if (received.at(-1) === "") {
    received.pop();
  }
  return {
    lines: received.slice(-limit),
    truncated: received.length > limit,
  };
}

/** The last lines of an execution's log, fetched when first shown. */
export function LogTail({
  groupId,
  executionId,
}: {
  groupId: number;
  executionId: number;
}) {
  const { data, isLoading, error, refetch, isFetching } = useQuery(
    executionsExecutionLogsOptions({
      path: { group_id: groupId.toString() },
      // One extra line tells whether the log is longer than what is shown
      query: {
        execution_id: executionId.toString(),
        lines: LOG_TAIL_LINES + 1,
      },
      parseAs: "text",
    }),
  );

  if (isLoading) {
    return (
      <div
        aria-busy="true"
        className="space-y-1.5 rounded-md border bg-muted p-3"
      >
        <span className="sr-only">Loading the log</span>
        {["w-11/12", "w-3/4", "w-5/6", "w-2/3", "w-4/5"].map((width) => (
          <Skeleton key={width} className={cn("h-3 bg-foreground/10", width)} />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm text-destructive">
        <span role="alert">
          Could not load the log: {apiErrorMessage(error)}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={isFetching}
          onClick={() => refetch()}
        >
          Try again
        </Button>
      </div>
    );
  }
  const { lines, truncated } = logTailLines(
    typeof data === "string" ? data : "",
    LOG_TAIL_LINES,
  );
  if (lines.length === 0) {
    return <p className="text-sm text-muted-foreground">The log is empty.</p>;
  }

  return (
    <pre className="max-h-96 overflow-auto rounded-md border bg-muted p-3 font-mono text-xs">
      {truncated && (
        <div className="text-muted-foreground">
          Last {LOG_TAIL_LINES} lines of the log
        </div>
      )}
      {lines.map((line, index) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: Log lines are not unique
          key={index}
          className={cn(ERROR_LINE.test(line) && "text-destructive")}
        >
          {line}
        </div>
      ))}
    </pre>
  );
}
