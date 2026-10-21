import { describe, expect, it } from "vitest";
import {
  executionStatus,
  executionStatusDisplay,
  latestExecutionStatus,
} from "./executionStatus";

const group = (...successful: (boolean | null)[]) => ({
  executions: successful.map((value) => ({ successful: value })),
});

describe("executionStatus", () => {
  it("maps whether an execution succeeded", () => {
    expect(executionStatus({ successful: true })).toBe("success");
    expect(executionStatus({ successful: false })).toBe("failed");
    expect(executionStatus({ successful: null })).toBe("running");
  });

  it("is not_run without an execution", () => {
    expect(executionStatus(undefined)).toBe("not_run");
    expect(executionStatus(null)).toBe("not_run");
  });
});

describe("latestExecutionStatus", () => {
  it("uses the last execution, which is the latest", () => {
    expect(latestExecutionStatus(group(false, true))).toBe("success");
    expect(latestExecutionStatus(group(true, false))).toBe("failed");
    expect(latestExecutionStatus(group(true, null))).toBe("running");
  });

  it("is not_run for a group without executions", () => {
    expect(latestExecutionStatus(group())).toBe("not_run");
  });
});

describe("executionStatusDisplay", () => {
  it("labels every status", () => {
    expect(executionStatusDisplay.success.label).toBe("Success");
    expect(executionStatusDisplay.failed.label).toBe("Failed");
    expect(executionStatusDisplay.running.label).toBe("Running");
    expect(executionStatusDisplay.not_run.label).toBe("Not run");
  });

  it("shows only a failure as destructive", () => {
    const destructive = Object.entries(executionStatusDisplay)
      .filter(([, display]) => display.badgeVariant === "destructive")
      .map(([status]) => status);
    expect(destructive).toEqual(["failed"]);
  });
});
