"use client";

import { Search } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  filterLogs,
  type LogLevelFilter,
  type LogMessage,
  levelClass,
} from "@/lib/executionLog";

const LEVEL_BUTTONS: { value: LogLevelFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "info", label: "Info" },
  { value: "warning", label: "Warning" },
  { value: "error", label: "Error" },
];

interface ExecutionLogViewProps {
  logs: LogMessage[];
}

export function ExecutionLogView({ logs }: ExecutionLogViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [logLevel, setLogLevel] = useState<LogLevelFilter>("all");

  const filteredLogs = filterLogs(logs, logLevel, searchTerm);

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
          {LEVEL_BUTTONS.map(({ value, label }) => (
            <Button
              key={value}
              variant={logLevel === value ? "default" : "outline"}
              size="sm"
              onClick={() => setLogLevel(value)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div className="">
        <ScrollArea className="h-[1200px] rounded-md border bg-muted p-4">
          <pre className="font-mono text-xs">
            {filteredLogs.map((log, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: The message might not have a unique identifier,
              <div key={index} className="mb-1 flex">
                <span className="mr-2 text-muted-foreground">
                  {log.timestamp}
                </span>
                <Badge
                  variant="outline"
                  className={`mr-2 items-start ${levelClass(log.level)}`}
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
