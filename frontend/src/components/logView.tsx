"use client";

import { Download, Search } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ExecutionLogsProps {
  type: string;
}

export function ExecutionLogs({ type }: ExecutionLogsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [logLevel, setLogLevel] = useState<
    "all" | "info" | "warning" | "error"
  >("all");

  // Sample log data - in a real app, this would come from an API
  const logs = [
    {
      timestamp: "2023-06-15 14:28:32",
      level: "info",
      message: `Starting metric calculation for ${type}`,
    },
    {
      timestamp: "2023-06-15 14:28:32",
      level: "info",
      message: "Loading model ResNet50-v2",
    },
    {
      timestamp: "2023-06-15 14:28:34",
      level: "info",
      message: "Model loaded successfully",
    },
    {
      timestamp: "2023-06-15 14:28:34",
      level: "info",
      message: "Loading dataset ImageNet-1K",
    },
    {
      timestamp: "2023-06-15 14:28:40",
      level: "info",
      message: "Dataset loaded successfully with 10000 samples",
    },
    {
      timestamp: "2023-06-15 14:28:40",
      level: "info",
      message: "Setting random seed to 42",
    },
    {
      timestamp: "2023-06-15 14:28:40",
      level: "info",
      message: "Starting inference on test set",
    },
    {
      timestamp: "2023-06-15 14:29:15",
      level: "info",
      message: "Batch 1/313 processed",
    },
    {
      timestamp: "2023-06-15 14:29:20",
      level: "warning",
      message: "CUDA memory usage high (85%)",
    },
    {
      timestamp: "2023-06-15 14:29:50",
      level: "info",
      message: "Batch 50/313 processed",
    },
    {
      timestamp: "2023-06-15 14:30:25",
      level: "info",
      message: "Batch 100/313 processed",
    },
    {
      timestamp: "2023-06-15 14:30:59",
      level: "info",
      message: "Batch 150/313 processed",
    },
    {
      timestamp: "2023-06-15 14:31:34",
      level: "info",
      message: "Batch 200/313 processed",
    },
    {
      timestamp: "2023-06-15 14:31:40",
      level: "error",
      message: "Failed to process image img_1234 - corrupt file",
    },
    {
      timestamp: "2023-06-15 14:31:41",
      level: "info",
      message: "Skipping corrupt image and continuing",
    },
    {
      timestamp: "2023-06-15 14:32:08",
      level: "info",
      message: "Batch 250/313 processed",
    },
    {
      timestamp: "2023-06-15 14:32:12",
      level: "info",
      message: "Batch 313/313 processed",
    },
    {
      timestamp: "2023-06-15 14:32:12",
      level: "info",
      message: "Inference completed",
    },
    {
      timestamp: "2023-06-15 14:32:12",
      level: "info",
      message: `Calculating ${type} metric`,
    },
    {
      timestamp: "2023-06-15 14:32:13",
      level: "info",
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} calculated: ${
        type === "accuracy"
          ? "0.927"
          : type === "precision"
            ? "0.893"
            : type === "recall"
              ? "0.941"
              : "0.915"
      }`,
    },
    {
      timestamp: "2023-06-15 14:32:14",
      level: "info",
      message: "Saving results to database",
    },
    {
      timestamp: "2023-06-15 14:32:14",
      level: "info",
      message: "MetricSummary calculation completed successfully",
    },
  ];

  const filteredLogs = logs.filter(
    (log) =>
      (logLevel === "all" || log.level === logLevel) &&
      (log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.timestamp.includes(searchTerm)),
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Execution Logs</CardTitle>
            <CardDescription>
              Log output from the metric calculation process. This is all fake
              log data for now
            </CardDescription>
          </div>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Download Logs
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={logLevel === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setLogLevel("all")}
              >
                All
              </Button>
              <Button
                variant={logLevel === "info" ? "default" : "outline"}
                size="sm"
                onClick={() => setLogLevel("info")}
              >
                Info
              </Button>
              <Button
                variant={logLevel === "warning" ? "default" : "outline"}
                size="sm"
                onClick={() => setLogLevel("warning")}
              >
                Warning
              </Button>
              <Button
                variant={logLevel === "error" ? "default" : "outline"}
                size="sm"
                onClick={() => setLogLevel("error")}
              >
                Error
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[500px] rounded-md border bg-muted p-4">
            <pre className="font-mono text-xs">
              {filteredLogs.map((log, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                <div key={index} className="mb-1 flex">
                  <span className="mr-2 text-muted-foreground">
                    {log.timestamp}
                  </span>
                  <Badge
                    variant="outline"
                    className={`mr-2 ${
                      log.level === "info"
                        ? "bg-blue-500/10 text-blue-500"
                        : log.level === "warning"
                          ? "bg-yellow-500/10 text-yellow-500"
                          : "bg-red-500/10 text-red-500"
                    }`}
                  >
                    {log.level.toUpperCase()}
                  </Badge>
                  <span>{log.message}</span>
                </div>
              ))}
            </pre>
          </ScrollArea>

          <div className="text-xs text-muted-foreground">
            Showing {filteredLogs.length} of {logs.length} log entries
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
