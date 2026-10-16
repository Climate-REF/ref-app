import { describe, expect, it } from "vitest";
import type {
  DiagnosticCatalogEntry,
  Execution,
  ExecutionGroup,
} from "@/client";
import {
  diagnosticHealth,
  failedRunRange,
  failuresByModel,
  groupFacets,
  groupsToShow,
  lastSucceededAt,
  summariseFailures,
} from "./failures";

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

/** A group of one model whose executions have these outcomes and dates, oldest first */
const modelGroup = (
  model: string,
  runs: [boolean | null, string][],
  selectorType: "cmip6" | "cmip7" = "cmip6",
) =>
  ({
    id: nextId++,
    provider_slug: "pmp",
    diagnostic_slug: "enso",
    selectors: {
      [selectorType]: [
        ["experiment_id", "historical"],
        [selectorType === "cmip6" ? "member_id" : "variant_label", "r1i1p1f1"],
        ["source_id", model],
      ],
      obs4mips: [["source_id", "HadISST-1-1"]],
    },
    executions: runs.map(
      ([successful, updated_at]) => ({ successful, updated_at }) as Execution,
    ),
  }) as unknown as ExecutionGroup;

describe("groupFacets", () => {
  it("reads the model run from CMIP6 selectors, not the reference data's", () => {
    expect(groupFacets(modelGroup("ACCESS-ESM1-5", []))).toEqual({
      model: "ACCESS-ESM1-5",
      experiment: "historical",
      member: "r1i1p1f1",
    });
  });

  it("reads the member from CMIP7's variant_label", () => {
    expect(groupFacets(modelGroup("CanESM5-1", [], "cmip7")).member).toBe(
      "r1i1p1f1",
    );
  });

  it("finds nothing for a group without model selectors", () => {
    expect(
      groupFacets({ selectors: { obs4mips: [] } } as unknown as ExecutionGroup),
    ).toEqual({
      model: undefined,
      experiment: undefined,
      member: undefined,
    });
  });
});

describe("lastSucceededAt", () => {
  it("finds the last success before the failure", () => {
    const g = modelGroup("A", [
      [true, "2026-01-01"],
      [true, "2026-02-01"],
      [false, "2026-03-01"],
    ]);
    expect(lastSucceededAt(g)).toBe("2026-02-01");
  });

  it("is undefined for a group that never succeeded", () => {
    expect(
      lastSucceededAt(
        modelGroup("A", [
          [false, "2026-01-01"],
          [false, "2026-02-01"],
        ]),
      ),
    ).toBeUndefined();
  });
});

describe("failedRunRange", () => {
  it("spans the oldest and most recent failed runs", () => {
    const [failures] = summariseFailures(
      [diagnostic("pmp", "enso", 3, 0)],
      [
        modelGroup("A", [[false, "2026-09-04T10:00:00"]]),
        modelGroup("B", [
          [true, "2026-01-01"],
          [false, "2026-10-12T07:00:00"],
        ]),
        modelGroup("C", [[false, "2026-09-05T08:00:00"]]),
      ],
    );
    expect(failedRunRange(failures)).toEqual({
      first: "2026-09-04T10:00:00",
      last: "2026-10-12T07:00:00",
    });
  });
});

describe("failuresByModel", () => {
  it("counts each model's failed groups and the diagnostics they are in", () => {
    const icon = () => ({
      ...modelGroup("ICON-ESM-LR", [[false, "2026-09-04"]]),
    });
    const summaries = summariseFailures(
      [diagnostic("pmp", "enso", 5, 1), diagnostic("pmp", "other", 5, 1)],
      [
        icon(),
        icon(),
        { ...icon(), diagnostic_slug: "other" },
        modelGroup("CESM2", [[false, "2026-09-04"]]),
      ],
    );
    expect(failuresByModel(summaries)).toEqual([
      { model: "ICON-ESM-LR", groups: 3, diagnostics: 2 },
      { model: "CESM2", groups: 1, diagnostics: 1 },
    ]);
  });
});

describe("groupsToShow", () => {
  it("keeps every failed group without a model, and only the model's groups with one", () => {
    const [failures] = summariseFailures(
      [diagnostic("pmp", "enso", 2, 0)],
      [
        modelGroup("A", [[false, "2026-09-04"]]),
        modelGroup("B", [[false, "2026-09-04"]]),
      ],
    );
    expect(groupsToShow(failures)).toHaveLength(2);
    expect(
      groupsToShow(failures, "B").map((g) => groupFacets(g).model),
    ).toEqual(["B"]);
  });
});
