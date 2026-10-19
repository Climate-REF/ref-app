import { describe, expect, it } from "vitest";
import type { AftDiagnosticDetail } from "@/client";
import type { CatalogDiagnostic } from "./diagnosticCatalog";
import {
  type DiagnosticFilterState,
  diagnosticFilterOptions,
  filterDiagnostics,
  hasActiveFilters,
  hasSelections,
  NO_DIAGNOSTIC_FILTERS,
  parseDiagnosticFilters,
  serialiseDiagnosticFilters,
} from "./diagnosticFilters";

function diagnostic(
  name: string,
  {
    provider = "pmp",
    description = "",
    hasValues = null,
    aft = null,
  }: {
    provider?: string;
    description?: string | null;
    hasValues?: boolean | null;
    aft?: { id: string; name?: string; theme?: string | null } | null;
  } = {},
): CatalogDiagnostic {
  return {
    name,
    slug: name,
    description,
    provider: { slug: provider, name: provider.toUpperCase() },
    has_metric_values: hasValues,
    aft_link:
      aft && ({ name: aft.id, theme: null, ...aft } as AftDiagnosticDetail),
  } as CatalogDiagnostic;
}

const filters = (
  changes: Partial<DiagnosticFilterState>,
): DiagnosticFilterState => ({ ...NO_DIAGNOSTIC_FILTERS, ...changes });

const names = (diagnostics: CatalogDiagnostic[]) =>
  diagnostics.map((d) => d.name);

describe("filterDiagnostics", () => {
  const all = [
    diagnostic("sea-ice", {
      provider: "esmvaltool",
      aft: { id: "AFT-1", theme: "Ocean" },
    }),
    diagnostic("enso", {
      description: "El Nino Southern Oscillation",
      aft: { id: "AFT-2", theme: "Atmosphere" },
    }),
    diagnostic("gpp", { provider: "ilamb", description: null }),
  ];

  it("keeps everything without filters", () => {
    expect(filterDiagnostics(all, NO_DIAGNOSTIC_FILTERS)).toEqual(all);
  });

  it.each([
    ["the name", "SEA", ["sea-ice"]],
    ["the description", "southern", ["enso"]],
    ["the provider name", "ILAMB", ["gpp"]],
    ["the provider slug", "esmval", ["sea-ice"]],
  ])("searches %s ignoring case", (_, search, expected) => {
    expect(names(filterDiagnostics(all, filters({ search })))).toEqual(
      expected,
    );
  });

  it("ignores a blank search", () => {
    expect(filterDiagnostics(all, filters({ search: "  " }))).toEqual(all);
  });

  it("keeps any of the selections within a filter", () => {
    expect(
      names(filterDiagnostics(all, filters({ providers: ["pmp", "ilamb"] }))),
    ).toEqual(["enso", "gpp"]);
  });

  it("leaves out diagnostics without an AFT link when filtering by AFT id or theme", () => {
    expect(
      names(filterDiagnostics(all, filters({ aftIds: ["AFT-1", "AFT-2"] }))),
    ).toEqual(["sea-ice", "enso"]);
    expect(
      names(filterDiagnostics(all, filters({ themes: ["Ocean"] }))),
    ).toEqual(["sea-ice"]);
  });

  it("keeps only the diagnostics matching every filter", () => {
    expect(
      names(
        filterDiagnostics(
          all,
          filters({ providers: ["pmp"], themes: ["Ocean", "Atmosphere"] }),
        ),
      ),
    ).toEqual(["enso"]);
    expect(
      filterDiagnostics(
        all,
        filters({ providers: ["pmp"], themes: ["Ocean"] }),
      ),
    ).toEqual([]);
  });

  it("filters by metric values, keeping diagnostics whose flags have not loaded yet", () => {
    const flagged = [
      diagnostic("with", { hasValues: true }),
      diagnostic("without", { hasValues: false }),
      diagnostic("pending", { hasValues: null }),
    ];
    expect(
      names(filterDiagnostics(flagged, filters({ metricValues: true }))),
    ).toEqual(["with", "pending"]);
    expect(
      names(filterDiagnostics(flagged, filters({ metricValues: false }))),
    ).toEqual(["without", "pending"]);
  });
});

describe("diagnosticFilterOptions", () => {
  it("lists each provider, AFT diagnostic and theme once, sorted", () => {
    const options = diagnosticFilterOptions([
      diagnostic("a", {
        provider: "pmp",
        aft: { id: "AFT-2", name: "Two", theme: "Ocean" },
      }),
      diagnostic("b", {
        provider: "esmvaltool",
        aft: { id: "AFT-1", name: "One", theme: "Land" },
      }),
      diagnostic("c", {
        provider: "pmp",
        aft: { id: "AFT-2", name: "Two", theme: "Ocean" },
      }),
      diagnostic("d", {
        provider: "ilamb",
        aft: { id: "AFT-3", name: "Three" },
      }),
      diagnostic("e", { provider: "ilamb" }),
    ]);
    expect(options).toEqual({
      providers: ["esmvaltool", "ilamb", "pmp"],
      aftLinks: [
        { id: "AFT-1", name: "One" },
        { id: "AFT-2", name: "Two" },
        { id: "AFT-3", name: "Three" },
      ],
      themes: ["Land", "Ocean"],
    });
  });
});

describe("hasActiveFilters", () => {
  it("counts the search as active but not as a selection", () => {
    const searched = filters({ search: "enso" });
    expect(hasActiveFilters(searched)).toBe(true);
    expect(hasSelections(searched)).toBe(false);
  });

  it("counts a metric values filter of false as a selection", () => {
    expect(hasSelections(filters({ metricValues: false }))).toBe(true);
    expect(hasActiveFilters(NO_DIAGNOSTIC_FILTERS)).toBe(false);
  });
});

describe("URL search params", () => {
  it.each([
    filters({}),
    filters({ search: "sea ice" }),
    filters({
      providers: ["pmp", "esmvaltool"],
      aftIds: ["AFT-1"],
      themes: ["Ocean", "Land"],
      metricValues: false,
    }),
    filters({ metricValues: true }),
  ])("round trips %j", (state) => {
    expect(parseDiagnosticFilters(serialiseDiagnosticFilters(state))).toEqual(
      state,
    );
  });

  it("joins lists with commas and writes the metric values flag as text", () => {
    expect(
      serialiseDiagnosticFilters(
        filters({ providers: ["pmp", "ilamb"], metricValues: true }),
      ),
    ).toEqual({
      search: undefined,
      providers: "pmp,ilamb",
      aftIds: undefined,
      themes: undefined,
      metricValues: "true",
    });
  });

  it("leaves out empty filters so they drop from the URL", () => {
    expect(
      Object.values(serialiseDiagnosticFilters(NO_DIAGNOSTIC_FILTERS)),
    ).toEqual([undefined, undefined, undefined, undefined, undefined]);
  });

  it("reads missing or empty params as no filter", () => {
    expect(parseDiagnosticFilters({})).toEqual(NO_DIAGNOSTIC_FILTERS);
    expect(parseDiagnosticFilters({ providers: "", themes: "Ocean," })).toEqual(
      filters({ themes: ["Ocean"] }),
    );
  });
});
