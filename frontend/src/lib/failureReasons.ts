import type { ExecutionGroup } from "@/client";

/** Used for failures without a recorded reason, e.g. from an API older than climate-ref 0.19 */
export const NOT_RECORDED = "not_recorded";

export interface FailureReasonInfo {
  label: string;
  description: string;
}

/** climate-ref's `ExecutionFailureReason` values, described as its docstrings do */
const FAILURE_REASONS: Record<string, FailureReasonInfo> = {
  diagnostic_error: {
    label: "Diagnostic error",
    description:
      "The diagnostic ran and reported an error that a retry with the same inputs would repeat",
  },
  system_error: {
    label: "System error",
    description:
      "The diagnostic could not run to completion for a reason outside it, e.g. a broken environment",
  },
  result_error: {
    label: "Result error",
    description:
      "The diagnostic succeeded but its outputs could not be copied or ingested",
  },
  abandoned: {
    label: "Abandoned",
    description:
      "The execution started but no result was recorded, e.g. its worker was killed",
  },
  not_started: {
    label: "Not started",
    description:
      "The execution was queued but never started, e.g. the solve was killed first",
  },
  cancelled: {
    label: "Cancelled",
    description: "The execution was marked failed by hand",
  },
  unknown: {
    label: "Unknown",
    description:
      "No reason was given, e.g. for failures recorded before reasons were tracked",
  },
  [NOT_RECORDED]: {
    label: "Not recorded",
    description: "The API did not report a reason for this failure",
  },
};

/** How a failure reason reads, keeping a reason this dashboard doesn't know yet as it is */
export function describeFailureReason(reason: string): FailureReasonInfo {
  return (
    FAILURE_REASONS[reason] ?? {
      label: reason,
      description:
        "A failure reason this version of the dashboard does not know",
    }
  );
}

/** Why a failed group's latest execution failed */
export function failureReasonOf(group: ExecutionGroup): string {
  // Executions are oldest first, so the last one is the latest
  return group.executions.at(-1)?.failure_reason ?? NOT_RECORDED;
}
