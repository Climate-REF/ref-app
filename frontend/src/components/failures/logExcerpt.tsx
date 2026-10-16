import { useQuery } from "@tanstack/react-query";
import { executionsExecutionLogsOptions } from "@/client/@tanstack/react-query.gen";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiErrorMessage } from "@/lib/apiError";
import { logTail, summariseLog } from "@/lib/logSummary";
import { cn } from "@/lib/utils";

const LOG_TAIL_LINES = 20;

/** Loguru marks each line with its level, e.g. "2025-01-01 12:00:00.000 | ERROR | ..." */
const ERROR_LINE = /\|\s*(ERROR|CRITICAL)\s*\|/;

function LogLines({
  lines,
  highlight,
}: {
  lines: string[];
  highlight?: boolean;
}) {
  return lines.map((line, index) => (
    <div
      // biome-ignore lint/suspicious/noArrayIndexKey: Log lines are not unique
      key={index}
      className={cn(
        "whitespace-pre-wrap break-words",
        highlight && ERROR_LINE.test(line) && "text-destructive",
      )}
    >
      {line}
    </div>
  ));
}

const LOG_BOX =
  "max-h-96 overflow-auto rounded-md border bg-muted p-3 font-mono text-xs";

/**
 * Why an execution failed, as far as its log tells, and the end of the log
 *
 * The whole log is fetched when first shown, because the error that explains a failure
 * can be anywhere in it, not only at the end.
 */
export function LogExcerpt({
  groupId,
  executionId,
}: {
  groupId: number;
  executionId: number;
}) {
  const { data, isLoading, error, refetch, isFetching } = useQuery(
    executionsExecutionLogsOptions({
      path: { group_id: groupId.toString() },
      query: { execution_id: executionId.toString() },
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

  const text = typeof data === "string" ? data : "";
  const tail = logTail(text, LOG_TAIL_LINES);
  if (tail.lines.length === 0) {
    return <p className="text-sm text-muted-foreground">The log is empty.</p>;
  }
  const summary = summariseLog(text);

  return (
    <Tabs
      defaultValue={summary.kind === "none" ? "tail" : "summary"}
      className="gap-1"
    >
      <TabsList className="h-8">
        <TabsTrigger value="summary" className="text-xs">
          Errors
        </TabsTrigger>
        <TabsTrigger value="tail" className="text-xs">
          Last {LOG_TAIL_LINES} lines
        </TabsTrigger>
      </TabsList>
      <TabsContent value="summary">
        {summary.kind === "none" ? (
          <p className="text-sm text-muted-foreground">
            The log contains no errors or warnings, so the failure was not
            reported in it. Check the last lines or the full log.
          </p>
        ) : (
          <div className="space-y-1">
            {summary.kind === "warnings" && (
              <p className="text-sm text-muted-foreground">
                No error was logged. The provider may have reported the failure
                only as a warning:
              </p>
            )}
            {summary.system && (
              <p className="text-sm text-muted-foreground">
                This looks like a problem with the system the provider ran on,
                such as its environment, disk, memory or network, rather than
                with the diagnostic:
              </p>
            )}
            <div className={LOG_BOX}>
              <LogLines lines={summary.lines} />
            </div>
          </div>
        )}
      </TabsContent>
      <TabsContent value="tail">
        <div className={LOG_BOX}>
          {tail.truncated && (
            <div className="text-muted-foreground">
              Last {LOG_TAIL_LINES} lines of the log, without traceback variable
              values
            </div>
          )}
          <LogLines lines={tail.lines} highlight />
        </div>
      </TabsContent>
    </Tabs>
  );
}
