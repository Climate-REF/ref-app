import type { DiagnosticCatalogEntry, ExecutionGroup } from "@/client";
import { describeFailureReason, failureReasonOf } from "./failureReasons";

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
 *
 * Only the unsuccessful groups matching `filters` are counted. When filtering by model,
 * pass a catalog counting only that model's groups, so the totals and successes match.
 */
export function summariseFailures(
  catalog: DiagnosticCatalogEntry[],
  unsuccessful: ExecutionGroup[],
  filters: FailureFilters = {},
): DiagnosticFailures[] {
  const groupsByDiagnostic = new Map<string, ExecutionGroup[]>();
  for (const group of unsuccessful) {
    if (!matchesFilters(group, filters)) {
      continue;
    }
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
      const successful = diagnostic.groups.successful;
      return {
        diagnostic,
        health: diagnosticHealth(successful, failedGroups.length),
        total: diagnostic.groups.total,
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

/**
 * Summarise how many of a diagnostic's execution groups failed, naming what the count is narrowed to,
 * e.g. "3 of 12 execution groups failed" or "1 of 4 CanESM5 execution groups failed (System error)"
 */
export function failureSummary(
  failures: DiagnosticFailures,
  { model, reason }: FailureFilters = {},
): string {
  const groups = model ? `${model} execution groups` : "execution groups";
  const why = reason ? ` (${describeFailureReason(reason).label})` : "";
  return `${failures.failedGroups.length} of ${failures.total} ${groups} failed${why}`;
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

/** Failed groups that share something, such as a model or a failure reason, across diagnostics */
export interface FailureCount {
  key: string;
  groups: number;
  diagnostics: number;
}

/** Count the failed groups by `keyOf`, most failures first, leaving out groups without a key */
function countFailures(
  diagnostics: DiagnosticFailures[],
  keyOf: (group: ExecutionGroup) => string | undefined,
): FailureCount[] {
  const byKey = new Map<string, { groups: number; diagnostics: Set<string> }>();
  for (const failures of diagnostics) {
    const diagnostic = `${failures.diagnostic.provider.slug}/${failures.diagnostic.slug}`;
    for (const group of failures.failedGroups) {
      const key = keyOf(group);
      if (key === undefined) {
        continue;
      }
      const entry = byKey.get(key) ?? { groups: 0, diagnostics: new Set() };
      entry.groups += 1;
      entry.diagnostics.add(diagnostic);
      byKey.set(key, entry);
    }
  }
  return [...byKey.entries()]
    .map(([key, { groups, diagnostics }]) => ({
      key,
      groups,
      diagnostics: diagnostics.size,
    }))
    .sort((a, b) => b.groups - a.groups || a.key.localeCompare(b.key));
}

/** Count the failed groups of each model, most failures first */
export function failuresByModel(
  diagnostics: DiagnosticFailures[],
): FailureCount[] {
  return countFailures(diagnostics, (group) => groupFacets(group).model);
}

/** Count the failed groups by why they failed, most failures first */
export function failuresByReason(
  diagnostics: DiagnosticFailures[],
): FailureCount[] {
  return countFailures(diagnostics, failureReasonOf);
}

/** How many of these failed groups failed for each reason, most first */
export function reasonBreakdown(
  groups: ExecutionGroup[],
): { reason: string; groups: number }[] {
  const counts = new Map<string, number>();
  for (const group of groups) {
    const reason = failureReasonOf(group);
    counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([reason, groups]) => ({ reason, groups }))
    .sort((a, b) => b.groups - a.groups || a.reason.localeCompare(b.reason));
}

/** What the failures page is narrowed to */
export interface FailureFilters {
  model?: string;
  reason?: string;
  /** The first day failures are counted from, as YYYY-MM-DD */
  from?: string;
  /** The last day failures are counted up to, as YYYY-MM-DD */
  to?: string;
}

/** The day a failed group's latest execution failed, as YYYY-MM-DD */
const failedOn = (group: ExecutionGroup) =>
  group.executions.at(-1)?.updated_at.slice(0, 10);

/**
 * Whether an unsuccessful group matches the filters
 *
 * The model applies to every group. The reason and time range describe failures,
 * so a running or not started group, which has neither, is kept.
 */
function matchesFilters(
  group: ExecutionGroup,
  { model, reason, from, to }: FailureFilters,
): boolean {
  if (model !== undefined && groupFacets(group).model !== model) {
    return false;
  }
  if (group.executions.at(-1)?.successful !== false) {
    return true;
  }
  if (reason !== undefined && failureReasonOf(group) !== reason) {
    return false;
  }
  if (from === undefined && to === undefined) {
    return true;
  }
  const day = failedOn(group) ?? "";
  return (from === undefined || day >= from) && (to === undefined || day <= to);
}

/** What the filters of the failures page can be set to, given the filters already set */
export interface FilterOptions {
  /** Each dropdown counts what selecting a value would show, given the other filters */
  reasons: FailureCount[];
  models: FailureCount[];
  /** The days with failures matching the other filters, as YYYY-MM-DD */
  days: Set<string>;
}

export function filterOptions(
  catalog: DiagnosticCatalogEntry[],
  unsuccessful: ExecutionGroup[],
  filters: FailureFilters,
): FilterOptions {
  const summarise = (narrowed: FailureFilters) =>
    summariseFailures(catalog, unsuccessful, narrowed);
  return {
    reasons: failuresByReason(summarise({ ...filters, reason: undefined })),
    models: failuresByModel(summarise({ ...filters, model: undefined })),
    days: new Set(
      summarise({ ...filters, from: undefined, to: undefined })
        .flatMap((failures) => failures.failedGroups)
        .map(failedOn)
        .filter((day) => day !== undefined),
    ),
  };
}

/** How many groups failed across the diagnostics, e.g. "3 failed execution groups in 2 diagnostics" */
export function failedGroupsSummary(diagnostics: DiagnosticFailures[]): string {
  const failing = diagnostics.filter(
    (failures) => failures.failedGroups.length > 0,
  );
  const groups = failing.reduce(
    (sum, failures) => sum + failures.failedGroups.length,
    0,
  );
  return `${groups} failed execution ${groups === 1 ? "group" : "groups"} in ${failing.length} ${failing.length === 1 ? "diagnostic" : "diagnostics"}`;
}

/** The first and last day any of these groups failed, as YYYY-MM-DD, or undefined if none did */
export function failureDays(
  groups: ExecutionGroup[],
): { from: string; to: string } | undefined {
  const days = groups
    .filter((group) => group.executions.at(-1)?.successful === false)
    .map(failedOn)
    .filter((day) => day !== undefined)
    .sort();
  return days.length > 0
    ? { from: days[0], to: days[days.length - 1] }
    : undefined;
}
