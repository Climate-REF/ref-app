import { describe, expect, it } from "vitest";
import {
  filterLogs,
  type LogMessage,
  levelClass,
  parseLogOutput,
} from "./executionLog";

const record = (timestamp: string, level: string, message: string) =>
  `${timestamp} | ${level.padEnd(8)} | climate_ref_core.providers:run:773 - ${message}`;

describe("parseLogOutput", () => {
  it("splits the log into records with their timestamp and level", () => {
    const log = [
      record("2026-10-12 07:19:49.775", "INFO", "Starting"),
      record("2026-10-12 07:19:50.001", "WARNING", "Slow"),
    ].join("\n");

    expect(parseLogOutput(log)).toEqual([
      {
        timestamp: "2026-10-12 07:19:49.775",
        level: "INFO",
        message: "climate_ref_core.providers:run:773 - Starting",
      },
      {
        timestamp: "2026-10-12 07:19:50.001",
        level: "WARNING",
        message: "climate_ref_core.providers:run:773 - Slow",
      },
    ]);
  });

  it("keeps the lines continuing a message with its record", () => {
    const log = [
      record("2026-10-12 07:19:49.775", "ERROR", "Execution failed"),
      "Traceback (most recent call last):",
      "ValueError: bad input",
      record("2026-10-12 07:19:50.001", "INFO", "Done"),
    ].join("\n");

    const parsed = parseLogOutput(log);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toEqual({
      timestamp: "2026-10-12 07:19:49.775",
      level: "ERROR",
      message:
        "climate_ref_core.providers:run:773 - Execution failed\nTraceback (most recent call last):\nValueError: bad input",
    });
  });

  it("keeps text before the first record as a message without a level", () => {
    const log = [
      "Preparing environment",
      record("2026-10-12 07:19:49.775", "INFO", "Starting"),
    ].join("\n");

    expect(parseLogOutput(log)[0]).toEqual({
      timestamp: null,
      level: null,
      message: "Preparing environment",
    });
    expect(parseLogOutput(log)[1].level).toBe("INFO");
  });

  it("keeps a timestamped line in another format as an unparsed message", () => {
    expect(parseLogOutput("2026-10-12 07:19:49.775 something else\n")).toEqual([
      {
        timestamp: null,
        level: null,
        message: "2026-10-12 07:19:49.775 something else",
      },
    ]);
  });

  it("is empty for an empty or blank log", () => {
    expect(parseLogOutput("")).toEqual([]);
    expect(parseLogOutput("\n  \n")).toEqual([]);
  });
});

describe("filterLogs", () => {
  const logs: LogMessage[] = [
    { timestamp: "2026-10-12 07:19:49.775", level: "INFO", message: "Start" },
    {
      timestamp: "2026-10-12 07:19:50.001",
      level: "ERROR",
      message: "Disk Full",
    },
    { timestamp: null, level: null, message: "plain text" },
  ];

  it("keeps everything for all levels and no search term", () => {
    expect(filterLogs(logs, "all", "")).toEqual(logs);
  });

  it("keeps only the messages at the level", () => {
    expect(filterLogs(logs, "error", "")).toEqual([logs[1]]);
    expect(filterLogs(logs, "debug", "")).toEqual([]);
  });

  it("matches the message ignoring case, or the timestamp", () => {
    expect(filterLogs(logs, "all", "disk")).toEqual([logs[1]]);
    expect(filterLogs(logs, "all", "07:19:49")).toEqual([logs[0]]);
  });

  it("combines the level and the search term", () => {
    expect(filterLogs(logs, "info", "disk")).toEqual([]);
  });
});

describe("levelClass", () => {
  it("colours each level", () => {
    expect(levelClass("DEBUG")).toContain("green");
    expect(levelClass("INFO")).toContain("blue");
    expect(levelClass("WARNING")).toContain("yellow");
    expect(levelClass("ERROR")).toContain("red");
  });
});
