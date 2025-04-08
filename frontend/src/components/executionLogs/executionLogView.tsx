"use client";

import { Search } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export interface LogMessage {
  timestamp: string | null;
  level: string | null;
  message: string;
}

interface ExecutionLogViewProps {
  logs: LogMessage[];
}

export function ExecutionLogView({ logs }: ExecutionLogViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [logLevel, setLogLevel] = useState<
    "all" | "debug" | "info" | "warning" | "error"
  >("all");

  const filteredLogs = logs.filter(
    (log) =>
      (logLevel === "all" || log.level?.toLowerCase() === logLevel) &&
      (log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.timestamp?.includes(searchTerm)),
  );

  return (
    <div className="space-y-4 over">
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

      <div className="">
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
                  className={`mr-2 items-start ${
                    log.level === "DEBUG"
                      ? "bg-green-500/10 text-green-500"
                      : log.level === "INFO"
                        ? "bg-blue-500/10 text-blue-500"
                        : log.level === "WARNING"
                          ? "bg-yellow-500/10 text-yellow-500"
                          : "bg-red-500/10 text-red-500"
                  }`}
                >
                  {log.level?.toUpperCase()}
                </Badge>
                <span>{log.message}</span>
              </div>
            ))}
          </pre>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      <div className="text-xs text-muted-foreground">
        Showing {filteredLogs.length} of {logs.length} log entries
      </div>
    </div>
  );
}
