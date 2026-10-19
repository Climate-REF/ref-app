import type { Execution } from "@/client";

/**
 * How an execution turned out
 *
 * * `success` -- it completed without errors
 * * `failed` -- it finished with an error
 * * `running` -- it has not finished yet
 * * `not_run` -- there is no execution, such as for a group that has never run
 */
export type ExecutionStatus = "success" | "failed" | "running" | "not_run";

/** The status of an execution, which is `not_run` when there is none. */
export function executionStatus(
  execution: Pick<Execution, "successful"> | null | undefined,
): ExecutionStatus {
  if (execution == null) {
    return "not_run";
  }
  if (execution.successful === null) {
    return "running";
  }
  return execution.successful ? "success" : "failed";
}

/** The status of a group's latest execution. Executions are oldest first, so the last one is the latest. */
export function latestExecutionStatus(group: {
  executions: Pick<Execution, "successful">[];
}): ExecutionStatus {
  return executionStatus(group.executions.at(-1));
}

/** How to show an execution status. */
interface ExecutionStatusDisplay {
  label: string;
  /** A sentence for a tooltip */
  description: string;
  badgeVariant: "default" | "secondary" | "destructive" | "outline";
}

export const executionStatusDisplay: Record<
  ExecutionStatus,
  ExecutionStatusDisplay
> = {
  success: {
    label: "Success",
    description: "Completed without errors.",
    badgeVariant: "outline",
  },
  failed: {
    label: "Failed",
    description: "Finished with an error.",
    badgeVariant: "destructive",
  },
  running: {
    label: "Running",
    description: "Still running.",
    badgeVariant: "secondary",
  },
  not_run: {
    label: "Not run",
    description: "Has not run yet.",
    badgeVariant: "secondary",
  },
};
