import { executionsGetExecutionResultLogsOptions } from "@/client/@tanstack/react-query.gen.ts";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { ExecutionLogView, type LogMessage } from "./executionLogView.tsx";

interface ExecutionLogContainerProps {
  executionId: number;
  resultId: number;
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
  executionId,
  resultId,
}: ExecutionLogContainerProps) {
  const { data, isLoading, error } = useQuery(
    executionsGetExecutionResultLogsOptions({
      path: { execution_id: executionId, result_id: resultId },
    }),
  );

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

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Execution Logs</CardTitle>
            <CardDescription>
              Log output from the metric calculation process.
            </CardDescription>
          </div>
          <Button
            variant={isLoading ? "ghost" : "outline"}
            disabled={isLoading}
            size="sm"
            onClick={() => handleDownload(data as string, "logs.txt")}
          >
            <Download className="mr-2 h-4 w-4" />
            Download Logs
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-40" />
        ) : (
          <ExecutionLogView logs={parseLogOutput((data as string) ?? "")} />
        )}
      </CardContent>
    </Card>
  );
}
