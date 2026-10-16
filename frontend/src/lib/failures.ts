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

/** The model run an execution group evaluated, read from its CMIP6 or CMIP7 selectors */
export interface GroupFacets {
  model?: string;
  experiment?: string;
  member?: string;
}

export function groupFacets(group: ExecutionGroup): GroupFacets {
  const pairs = group.selectors.cmip6 ?? group.selectors.cmip7 ?? [];
  const value = (key: string) => pairs.find(([name]) => name === key)?.[1];
  return {
    model: value("source_id"),
    experiment: value("experiment_id"),
    // CMIP6 calls the ensemble member member_id, CMIP7 variant_label
    member: value("member_id") ?? value("variant_label"),
  };
}

/** When the group last succeeded before its latest execution, or undefined if it never did */
export function lastSucceededAt(group: ExecutionGroup): string | undefined {
  // Executions are oldest first, and the last one is the failure itself
  return group.executions
    .slice(0, -1)
    .findLast((execution) => execution.successful === true)?.updated_at;
}

/** When the failed executions of a diagnostic's groups ran, oldest and most recent */
export function failedRunRange(
  failures: DiagnosticFailures,
): { first: string; last: string } | undefined {
  const dates = failures.failedGroups
    .map((group) => group.executions.at(-1)?.updated_at)
    .filter((date) => date !== undefined)
    .sort();
  return dates.length > 0
    ? { first: dates[0], last: dates[dates.length - 1] }
    : undefined;
}

/** Failed groups of one model, across diagnostics */
export interface ModelFailures {
  model: string;
  groups: number;
  diagnostics: number;
}

/** Count the failed groups of each model, most failures first */
export function failuresByModel(
  diagnostics: DiagnosticFailures[],
): ModelFailures[] {
  const byModel = new Map<
    string,
    { groups: number; diagnostics: Set<string> }
  >();
  for (const failures of diagnostics) {
    const diagnostic = `${failures.diagnostic.provider.slug}/${failures.diagnostic.slug}`;
    for (const group of failures.failedGroups) {
      const { model } = groupFacets(group);
      if (model === undefined) {
        continue;
      }
      const entry = byModel.get(model) ?? { groups: 0, diagnostics: new Set() };
      entry.groups += 1;
      entry.diagnostics.add(diagnostic);
      byModel.set(model, entry);
    }
  }
  return [...byModel.entries()]
    .map(([model, { groups, diagnostics }]) => ({
      model,
      groups,
      diagnostics: diagnostics.size,
    }))
    .sort((a, b) => b.groups - a.groups || a.model.localeCompare(b.model));
}

/** The failed groups of a diagnostic to show, only those of `model` when one is given */
export function groupsToShow(
  failures: DiagnosticFailures,
  model?: string,
): ExecutionGroup[] {
  return model === undefined
    ? failures.failedGroups
    : failures.failedGroups.filter(
        (group) => groupFacets(group).model === model,
      );
}
