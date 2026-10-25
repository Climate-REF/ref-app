import { describe, expect, it } from "vitest";
import type {
  DiagnosticCatalogEntry,
  Execution,
  ExecutionGroup,
} from "@/client";
import {
  diagnosticHealth,
  failedGroupsSummary,
  failedRunRange,
  failureDays,
  failureSummary,
  failuresByModel,
  failuresByReason,
  filterOptions,
  groupFacets,
  groupTotals,
  lastSucceededAt,
  reasonBreakdown,
  summariseFailures,
  withModelsWithoutFailures,
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
    groups: { total, successful },
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
  runs: [boolean | null, string, string?][],
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
      ([successful, updated_at, failure_reason = null]) =>
        ({ successful, updated_at, failure_reason }) as Execution,
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
      { key: "ICON-ESM-LR", groups: 3, diagnostics: 2 },
      { key: "CESM2", groups: 1, diagnostics: 1 },
    ]);
  });
});

describe("failure reasons", () => {
  const summaries = () =>
    summariseFailures(
      [diagnostic("pmp", "enso", 5, 0), diagnostic("pmp", "other", 5, 0)],
      [
        modelGroup("A", [[false, "2026-09-04", "system_error"]]),
        modelGroup("B", [
          [false, "2026-09-01", "diagnostic_error"],
          [false, "2026-09-04", "system_error"],
        ]),
        {
          ...modelGroup("A", [[false, "2026-09-04", "diagnostic_error"]]),
          diagnostic_slug: "other",
        },
        // A failure from an API that does not report reasons
        modelGroup("C", [[false, "2026-09-04"]]),
      ],
    );

  it("counts the failed groups by the reason their latest execution failed", () => {
    expect(failuresByReason(summaries())).toEqual([
      { key: "system_error", groups: 2, diagnostics: 1 },
      { key: "diagnostic_error", groups: 1, diagnostics: 1 },
      { key: "not_recorded", groups: 1, diagnostics: 1 },
    ]);
  });

  it("breaks a diagnostic's failures down by reason", () => {
    const [enso] = summaries();
    expect(reasonBreakdown(enso.failedGroups)).toEqual([
      { reason: "system_error", groups: 2 },
      { reason: "not_recorded", groups: 1 },
    ]);
  });
});

describe("filtering", () => {
  const groups = () => [
    modelGroup("A", [[false, "2026-09-04T10:00:00", "system_error"]]),
    modelGroup("B", [[false, "2026-09-20T10:00:00", "system_error"]]),
    modelGroup("B", [[false, "2026-10-12T10:00:00", "diagnostic_error"]]),
    // Still running, so it has neither a failure reason nor a failure date
    modelGroup("B", [[null, "2026-10-13T10:00:00"]]),
  ];
  const summarise = (filters: Parameters<typeof summariseFailures>[2]) =>
    summariseFailures([diagnostic("pmp", "enso", 10, 6)], groups(), filters)[0];
  const models = (failures: ReturnType<typeof summarise>) =>
    failures.failedGroups.map((g) => groupFacets(g).model);

  it("counts every unsuccessful group without filters", () => {
    const failures = summarise({});
    expect(failures.failedGroups).toHaveLength(3);
    expect(failures.running).toBe(1);
  });

  it("keeps the failed groups matching every filter", () => {
    expect(models(summarise({ model: "B" }))).toEqual(["B", "B"]);
    expect(models(summarise({ reason: "system_error" }))).toEqual(["A", "B"]);
    expect(models(summarise({ model: "B", reason: "system_error" }))).toEqual([
      "B",
    ]);
    expect(models(summarise({ from: "2026-09-05", to: "2026-09-30" }))).toEqual(
      ["B"],
    );
    expect(models(summarise({ to: "2026-09-04" }))).toEqual(["A"]);
  });

  it("keeps running groups when filtering by failure reason or time", () => {
    expect(
      summarise({ reason: "diagnostic_error", from: "2026-10-01" }).running,
    ).toBe(1);
    expect(summarise({ model: "A" }).running).toBe(0);
  });

  it("works out the health from the matching failures", () => {
    // Six groups succeeded, so a diagnostic with matching failures is partly failing
    expect(summarise({ reason: "system_error" }).health).toBe("partial");
    expect(summarise({ reason: "result_error" }).health).toBe("healthy");
  });
});

describe("failureDays", () => {
  it("spans the first and last day a group failed, ignoring running groups", () => {
    expect(
      failureDays([
        modelGroup("A", [[false, "2026-09-20T10:00:00"]]),
        modelGroup("B", [[false, "2026-09-04T23:59:00"]]),
        modelGroup("C", [[null, "2026-10-13T10:00:00"]]),
      ]),
    ).toEqual({ from: "2026-09-04", to: "2026-09-20" });
  });

  it("is undefined when nothing failed", () => {
    expect(failureDays([])).toBeUndefined();
  });
});

describe("filterOptions", () => {
  const groups = [
    modelGroup("A", [[false, "2026-09-04T10:00:00", "system_error"]]),
    modelGroup("B", [[false, "2026-09-20T10:00:00", "system_error"]]),
    modelGroup("B", [[false, "2026-10-12T10:00:00", "diagnostic_error"]]),
    modelGroup("B", [[null, "2026-10-13T10:00:00"]]),
  ];
  const options = (filters: Parameters<typeof filterOptions>[2]) =>
    filterOptions([diagnostic("pmp", "enso", 10, 6)], groups, filters);

  it("counts each filter's values given the other filters", () => {
    const { reasons, models, days } = options({ model: "B" });
    expect(reasons).toEqual([
      { key: "diagnostic_error", groups: 1, diagnostics: 1 },
      { key: "system_error", groups: 1, diagnostics: 1 },
    ]);
    // The selected model does not narrow the models to choose from
    expect(models).toEqual([
      { key: "B", groups: 2, diagnostics: 1 },
      { key: "A", groups: 1, diagnostics: 1 },
    ]);
    expect(days).toEqual(new Set(["2026-09-20", "2026-10-12"]));
  });

  it("marks the days outside the time range picked", () => {
    const { reasons, models, days } = options({
      reason: "system_error",
      from: "2026-09-10",
    });
    expect(reasons.map(({ key }) => key)).toEqual([
      "diagnostic_error",
      "system_error",
    ]);
    expect(models).toEqual([{ key: "B", groups: 1, diagnostics: 1 }]);
    expect(days).toEqual(new Set(["2026-09-04", "2026-09-20"]));
  });
});

describe("failedGroupsSummary", () => {
  const catalog = [
    diagnostic("pmp", "enso", 10, 6),
    diagnostic("pmp", "other", 2, 2),
  ];
  const groups = [
    modelGroup("A", [[false, "2026-09-04T10:00:00"]]),
    modelGroup("B", [[false, "2026-09-20T10:00:00"]]),
  ];

  it("counts the failed groups and the diagnostics they are in", () => {
    expect(failedGroupsSummary(summariseFailures(catalog, groups))).toBe(
      "2 failed execution groups in 1 diagnostic",
    );
    expect(
      failedGroupsSummary(summariseFailures(catalog, groups, { model: "A" })),
    ).toBe("1 failed execution group in 1 diagnostic");
    expect(failedGroupsSummary(summariseFailures(catalog, []))).toBe(
      "0 failed execution groups in 0 diagnostics",
    );
  });
});

describe("failureSummary", () => {
  it("names the model and failure reason it is narrowed to", () => {
    const [failures] = summariseFailures(
      [diagnostic("pmp", "enso", 4, 3)],
      [modelGroup("CanESM5", [[false, "2026-09-04", "system_error"]])],
    );
    expect(failureSummary(failures)).toBe("1 of 4 execution groups failed");
    expect(
      failureSummary(failures, { model: "CanESM5", reason: "system_error" }),
    ).toBe("1 of 4 CanESM5 execution groups failed (System error)");
  });
});

describe("withModelsWithoutFailures", () => {
  it("lists the models without failures after the failing ones, by name", () => {
    const failing = [{ key: "CESM2", groups: 2, diagnostics: 1 }];
    expect(
      withModelsWithoutFailures(failing, ["MIROC6", "CESM2", "ACCESS-ESM1-6"]),
    ).toEqual([
      { key: "CESM2", groups: 2, diagnostics: 1 },
      { key: "ACCESS-ESM1-6", groups: 0, diagnostics: 0 },
      { key: "MIROC6", groups: 0, diagnostics: 0 },
    ]);
  });
});

describe("groupTotals", () => {
  it("adds up the groups and successes of every diagnostic", () => {
    const summaries = summariseFailures(
      [diagnostic("pmp", "enso", 5, 4), diagnostic("ilamb", "gpp", 3, 3)],
      [],
    );
    expect(groupTotals(summaries)).toEqual({ total: 8, successful: 7 });
    expect(groupTotals([])).toEqual({ total: 0, successful: 0 });
  });
});
