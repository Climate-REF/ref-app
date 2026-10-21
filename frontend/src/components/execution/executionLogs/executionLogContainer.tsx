import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { executionsExecutionLogsOptions } from "@/client/@tanstack/react-query.gen.ts";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { apiErrorMessage } from "@/lib/apiError";
import { downloadTextFile } from "@/lib/downloadUtils.ts";
import { parseLogOutput } from "@/lib/executionLog";
import { ExecutionLogView } from "./executionLogView.tsx";

interface ExecutionLogContainerProps {
  groupId: string;
  executionId?: string;
}

export function ExecutionLogContainer({
  groupId,
  executionId,
}: ExecutionLogContainerProps) {
  const { data, isLoading, error } = useQuery({
    ...executionsExecutionLogsOptions({
      path: { group_id: groupId },
      query: { execution_id: executionId },
    }),
    gcTime: 0,
  });

  const [logContent, setLogContent] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    if (!data) {
      return;
    }

    if (data instanceof ReadableStream) {
      // Ensure we don't try to read a locked stream
      if (data.locked) {
        return;
      }
      setIsStreaming(true);
      const reader = data.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = "";
      setLogContent(""); // Reset for new stream

      const processStream = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              break;
            }
            accumulatedContent += decoder.decode(value, { stream: true });
            setLogContent(accumulatedContent);
          }
        } catch (e) {
          // Log error if it's not a user-initiated cancellation
          if (e instanceof Error && e.name !== "AbortError") {
            console.error("Error reading stream:", e);
          }
        } finally {
          setIsStreaming(false);
        }
      };

      processStream();

      return () => {
        reader.cancel();
      };
      // biome-ignore lint/style/noUselessElse: Handled elsewhere
    } else if (typeof data === "string") {
      setLogContent(data);
    }
  }, [data]);

  const parsedLogs = useMemo(() => parseLogOutput(logContent), [logContent]);

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error Loading Logs</CardTitle>
          <CardDescription>
            An error occurred while loading the logs: {apiErrorMessage(error)}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const isBusy = isLoading || isStreaming;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Execution Logs</CardTitle>
            <CardDescription>Log output during the execution.</CardDescription>
          </div>
          <Button
            variant={isBusy ? "ghost" : "outline"}
            disabled={isBusy}
            size="sm"
            onClick={() =>
              downloadTextFile(
                logContent,
                // Without an execution the logs are the group's latest execution's
                executionId
                  ? `logs-${groupId}-${executionId}.txt`
                  : `logs-${groupId}.txt`,
              )
            }
          >
            <Download className="mr-2 h-4 w-4" />
            Download Logs
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && !logContent ? (
          <Skeleton className="h-40" />
        ) : (
          <ExecutionLogView logs={parsedLogs} />
        )}
      </CardContent>
    </Card>
  );
}
