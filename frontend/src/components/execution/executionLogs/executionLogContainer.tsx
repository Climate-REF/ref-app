import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { useEffect, useState } from "react";
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
import { ExecutionLogView, type LogMessage } from "./executionLogView.tsx";

interface ExecutionLogContainerProps {
  groupId: string;
  executionId?: string;
}

function parseLogOutput(logOutput: string) {
  const splitRegex = /(?=\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3})/g;
  const parseRegex =
    /(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}) \| (\w+) +\|(.*)/s; // 's' flag for DOTALL in TypeScript

  const logMessages = logOutput.split(splitRegex);
  const parsedLogs: LogMessage[] = [];

  // Remove the first empty string if the log starts with a timestamp
  if (logMessages[0] === "") {
    logMessages.shift();
  }

  for (const logMessage of logMessages) {
    const trimmedMessage = logMessage.trim();
    if (!trimmedMessage) {
      continue; // Skip empty strings
    }

    const match = trimmedMessage.match(parseRegex);
    if (match) {
      const timestamp = match[1];
      const level = match[2].trim();
      const message = match[3].trim();
      parsedLogs.push({ timestamp, level, message });
    } else {
      parsedLogs.push({
        timestamp: null,
        level: null,
        message: trimmedMessage,
      }); // Mark as unparsed but include message
    }
  }
  return parsedLogs;
}

const handleDownload = (fileData: string, filename: string) => {
  const blob = new Blob([fileData], { type: "text/plain" });
  const url = URL.createObjectURL(blob);

  const downloadLink = document.createElement("a");
  downloadLink.href = url;
  downloadLink.download = filename;

  // Add to dom, click and remove
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);

  URL.revokeObjectURL(url);
};

export function ExecutionLogContainer({
  groupId,
  executionId,
}: ExecutionLogContainerProps) {
  const { data, isLoading, error } = useQuery(
    executionsExecutionLogsOptions({
      path: { group_id: groupId },
      query: { execution_id: executionId },
    }),
  );

  const [logContent, setLogContent] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    if (!data) {
      return;
    }

    if (data instanceof ReadableStream) {
      setIsStreaming(true);
      const reader = data.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = "";

      const processStream = async () => {
        // biome-ignore lint/correctness/noConstantCondition: stream reading
        while (true) {
          try {
            const { done, value } = await reader.read();
            if (done) {
              break;
            }
            accumulatedContent += decoder.decode(value, { stream: true });
            setLogContent(accumulatedContent);
          } catch (e) {
            console.error("Error reading stream:", e);
            break;
          }
        }
        setIsStreaming(false);
      };

      processStream();
    } else if (typeof data === "string") {
      setLogContent(data);
    }
  }, [data]);

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error Loading Logs</CardTitle>
          <CardDescription>
            An error occurred while loading the logs: {error.message}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const isBusy = isLoading || isStreaming;
  const parsedLogs = parseLogOutput(logContent);

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
            onClick={() => handleDownload(logContent, "logs.txt")}
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
