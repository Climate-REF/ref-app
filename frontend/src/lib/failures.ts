import type { DiagnosticCatalogEntry, ExecutionGroup } from "@/client";

/**
 * How a diagnostic's execution groups turned out
 *
 * * `healthy` -- no group failed and at least one succeeded
 * * `partial` -- some groups failed and some succeeded
 * * `failed` -- every group that finished failed
 * * `not_run` -- no group has finished yet
 */
export type DiagnosticHealth = "healthy" | "partial" | "failed" | "not_run";

export function diagnosticHealth(
  successful: number,
  failed: number,
): DiagnosticHealth {
  if (failed === 0) {
    return successful > 0 ? "healthy" : "not_run";
  }
  return successful > 0 ? "partial" : "failed";
}

/** A diagnostic's execution groups, counted by the outcome of their latest execution. */
export interface DiagnosticFailures {
  diagnostic: DiagnosticCatalogEntry;
  health: DiagnosticHealth;
  total: number;
  successful: number;
  running: number;
  notStarted: number;
  /** Groups whose latest execution failed, in the order they were given */
  failedGroups: ExecutionGroup[];
}

/**
 * Combine the diagnostic catalog with the execution groups whose latest execution did not succeed
 *
 * The catalog counts each diagnostic's groups and successful groups,
 * and the unsuccessful groups split the rest into failed, running and not started.
 * Groups of a diagnostic the catalog does not list are left out.
 * Diagnostics are ordered by provider then diagnostic slug.
 */
export function summariseFailures(
  catalog: DiagnosticCatalogEntry[],
  unsuccessful: ExecutionGroup[],
): DiagnosticFailures[] {
  const groupsByDiagnostic = new Map<string, ExecutionGroup[]>();
  for (const group of unsuccessful) {
    const key = `${group.provider_slug}/${group.diagnostic_slug}`;
    groupsByDiagnostic.set(key, [
      ...(groupsByDiagnostic.get(key) ?? []),
      group,
    ]);
  }

  return [...catalog]
    .sort(
      (a, b) =>
        a.provider.slug.localeCompare(b.provider.slug) ||
        a.slug.localeCompare(b.slug),
    )
    .map((diagnostic) => {
      const groups =
        groupsByDiagnostic.get(
          `${diagnostic.provider.slug}/${diagnostic.slug}`,
        ) ?? [];
      // Executions are oldest first, so the last one is the latest
      const failedGroups = groups.filter(
        (group) => group.executions.at(-1)?.successful === false,
      );
      const successful = diagnostic.successful_execution_group_count;
      return {
        diagnostic,
        health: diagnosticHealth(successful, failedGroups.length),
        total: diagnostic.execution_group_count,
        successful,
        running: groups.filter(
          (group) => group.executions.at(-1)?.successful === null,
        ).length,
        notStarted: groups.filter((group) => group.executions.length === 0)
          .length,
        failedGroups,
      };
    });
}

/** Summarise how many of a diagnostic's execution groups failed, e.g. "3 of 12 execution groups failed". */
export function failureSummary(failures: DiagnosticFailures): string {
  return `${failures.failedGroups.length} of ${failures.total} execution groups failed`;
}

/** The anchor a failing diagnostic's section is reachable at on the failures page. */
export function failuresAnchor(diagnostic: DiagnosticCatalogEntry): string {
  return `${diagnostic.provider.slug}-${diagnostic.slug}`;
}
