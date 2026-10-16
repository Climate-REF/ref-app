import { describe, expect, it } from "vitest";
import type {
  DiagnosticCatalogEntry,
  Execution,
  ExecutionGroup,
} from "@/client";
import { diagnosticHealth, summariseFailures } from "./failures";

const diagnostic = (
  provider: string,
  slug: string,
  total: number,
  successful: number,
) =>
  ({
    provider: { slug: provider, name: provider },
    slug,
    name: slug,
    execution_group_count: total,
    successful_execution_group_count: successful,
  }) as DiagnosticCatalogEntry;

let nextId = 1;
/** An execution group with one execution per outcome, oldest first, as the API lists them */
const group = (
  provider: string,
  slug: string,
  ...outcomes: (boolean | null)[]
) =>
  ({
    id: nextId++,
    provider_slug: provider,
    diagnostic_slug: slug,
    executions: outcomes.map((successful) => ({ successful }) as Execution),
  }) as ExecutionGroup;

describe("diagnosticHealth", () => {
  it.each([
    [0, 0, "not_run"],
    [3, 0, "healthy"],
    [3, 1, "partial"],
    [0, 2, "failed"],
  ] as const)(
    "%i successful and %i failed is %s",
    (successful, failed, expected) => {
      expect(diagnosticHealth(successful, failed)).toBe(expected);
    },
  );
});

describe("summariseFailures", () => {
  it("splits the unsuccessful groups by the outcome of their latest execution", () => {
    const failedLatest = group("pmp", "enso", true, false);
    const [summary] = summariseFailures(
      [diagnostic("pmp", "enso", 6, 2)],
      [
        failedLatest,
        group("pmp", "enso", false, null),
        group("pmp", "enso"),
        group("pmp", "enso"),
      ],
    );

    expect(summary.failedGroups).toEqual([failedLatest]);
    expect(summary).toMatchObject({
      health: "partial",
      total: 6,
      successful: 2,
      running: 1,
      notStarted: 2,
    });
  });

  it("is failed when no group succeeded", () => {
    const [summary] = summariseFailures(
      [diagnostic("ilamb", "gpp", 2, 0)],
      [group("ilamb", "gpp", false), group("ilamb", "gpp", false)],
    );
    expect(summary.health).toBe("failed");
  });

  it("matches groups on both the provider and diagnostic slug", () => {
    const summaries = summariseFailures(
      [
        diagnostic("pmp", "annual-cycle", 1, 1),
        diagnostic("esmvaltool", "annual-cycle", 1, 0),
      ],
      [group("esmvaltool", "annual-cycle", false)],
    );
    expect(
      summaries.map((s) => [s.diagnostic.provider.slug, s.health]),
    ).toEqual([
      ["esmvaltool", "failed"],
      ["pmp", "healthy"],
    ]);
  });

  it("leaves out groups of diagnostics the catalog does not list", () => {
    const summaries = summariseFailures(
      [diagnostic("pmp", "enso", 1, 1)],
      [group("ilamb", "hidden", false)],
    );
    expect(summaries).toHaveLength(1);
    expect(summaries[0].failedGroups).toEqual([]);
  });
});
