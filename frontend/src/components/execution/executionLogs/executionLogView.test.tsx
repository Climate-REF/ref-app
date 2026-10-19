import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { LogMessage } from "@/lib/executionLog";
import { ExecutionLogView } from "./executionLogView";

const LOGS: LogMessage[] = [
  { timestamp: null, level: null, message: "Preparing environment" },
  { timestamp: "2026-10-12 07:19:49.775", level: "DEBUG", message: "Config" },
  { timestamp: "2026-10-12 07:19:50.001", level: "INFO", message: "Started" },
];

describe("ExecutionLogView", () => {
  it("shows a level badge only for parsed messages", () => {
    render(<ExecutionLogView logs={LOGS} />);
    const unparsed = screen.getByText("Preparing environment").parentElement;
    expect(unparsed?.querySelector("[data-slot='badge']")).toBeNull();
    expect(screen.getByText("DEBUG")).toBeInTheDocument();
    expect(screen.getByText("INFO")).toBeInTheDocument();
  });

  it("narrows the log to debug messages", () => {
    render(<ExecutionLogView logs={LOGS} />);
    fireEvent.click(screen.getByRole("button", { name: "Debug" }));
    expect(screen.getByText("Config")).toBeInTheDocument();
    expect(screen.queryByText("Started")).not.toBeInTheDocument();
    expect(screen.getByText("Showing 1 of 3 log entries")).toBeInTheDocument();
  });
});
