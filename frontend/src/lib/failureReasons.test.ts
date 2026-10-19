import { describe, expect, it } from "vitest";
import type { Execution, ExecutionGroup } from "@/client";
import {
  describeFailureReason,
  failureReasonOf,
  NOT_RECORDED,
} from "./failureReasons";

const group = (...reasons: (string | null | undefined)[]) =>
  ({
    executions: reasons.map(
      (failure_reason) => ({ failure_reason }) as Execution,
    ),
  }) as ExecutionGroup;

describe("failureReasonOf", () => {
  it("reads the reason of the latest execution", () => {
    expect(failureReasonOf(group("diagnostic_error", "system_error"))).toBe(
      "system_error",
    );
  });

  it("reports a missing reason as not recorded", () => {
    expect(failureReasonOf(group(null))).toBe(NOT_RECORDED);
    // An API older than climate-ref 0.19 sends no failure_reason at all
    expect(failureReasonOf(group(undefined))).toBe(NOT_RECORDED);
  });
});

describe("describeFailureReason", () => {
  it("names the reasons climate-ref defines", () => {
    expect(describeFailureReason("system_error").label).toBe("System error");
    expect(describeFailureReason(NOT_RECORDED).label).toBe("Not recorded");
  });

  it("keeps a reason added after this dashboard as it is", () => {
    expect(describeFailureReason("quota_exceeded").label).toBe(
      "quota_exceeded",
    );
  });
});
