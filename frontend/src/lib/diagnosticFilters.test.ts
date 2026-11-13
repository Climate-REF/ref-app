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
  const catalog = [
    diagnostic("sea-ice", {
      provider: "esmvaltool",
      hasValues: true,
      aft: { id: "AFT-1", name: "Sea Ice", theme: "Ocean" },
    }),
    diagnostic("enso", {
      provider: "pmp",
      hasValues: false,
      aft: { id: "AFT-2", name: "ENSO", theme: "Atmosphere" },
    }),
    diagnostic("gpp", { provider: "ilamb", hasValues: null }),
    diagnostic("gpp-pmp", {
      provider: "pmp",
      hasValues: null,
      aft: { id: "AFT-1", name: "Sea Ice", theme: "Ocean" },
    }),
    diagnostic("veg", {
      provider: "ilamb",
      hasValues: null,
      aft: { id: "AFT-3", name: "Veg", theme: "Land" },
    }),
  ];

  it("lists each provider, AFT diagnostic and theme once, sorted, with counts", () => {
    expect(diagnosticFilterOptions(catalog, NO_DIAGNOSTIC_FILTERS)).toEqual({
      providers: [
        { value: "esmvaltool", count: 1 },
        { value: "ilamb", count: 2 },
        { value: "pmp", count: 2 },
      ],
      aftLinks: [
        { id: "AFT-1", name: "Sea Ice", count: 2 },
        { id: "AFT-2", name: "ENSO", count: 1 },
        { id: "AFT-3", name: "Veg", count: 1 },
      ],
      themes: [
        { value: "Atmosphere", count: 1 },
        { value: "Land", count: 1 },
        { value: "Ocean", count: 2 },
      ],
      metricValues: [
        { value: "true", count: 4 },
        { value: "false", count: 4 },
      ],
    });
  });

  it("does not narrow a facet's options by its own selection", () => {
    expect(
      diagnosticFilterOptions(catalog, filters({ providers: ["pmp"] }))
        .providers,
    ).toEqual([
      { value: "esmvaltool", count: 1 },
      { value: "ilamb", count: 2 },
      { value: "pmp", count: 2 },
    ]);
  });

  it("narrows the AFT and theme options by the other selections", () => {
    const options = diagnosticFilterOptions(
      catalog,
      filters({ providers: ["pmp"] }),
    );
    expect(options.aftLinks).toEqual([
      { id: "AFT-1", name: "Sea Ice", count: 1 },
      { id: "AFT-2", name: "ENSO", count: 1 },
    ]);
    expect(options.themes).toEqual([
      { value: "Atmosphere", count: 1 },
      { value: "Ocean", count: 1 },
    ]);
  });

  it("narrows every option by the search", () => {
    expect(
      diagnosticFilterOptions(catalog, filters({ search: "SEA" })),
    ).toEqual({
      providers: [{ value: "esmvaltool", count: 1 }],
      aftLinks: [{ id: "AFT-1", name: "Sea Ice", count: 1 }],
      themes: [{ value: "Ocean", count: 1 }],
      metricValues: [
        { value: "true", count: 1 },
        { value: "false", count: 0 },
      ],
    });
  });

  it("counts diagnostics without loaded flags in both metric values options", () => {
    const options = diagnosticFilterOptions(catalog, filters({}));
    expect(options.metricValues).toEqual([
      { value: "true", count: 4 },
      { value: "false", count: 4 },
    ]);

    // gpp-pmp has no flags yet, so it counts for both while enso only has false.
    expect(
      diagnosticFilterOptions(catalog, filters({ providers: ["pmp"] }))
        .metricValues,
    ).toEqual([
      { value: "true", count: 1 },
      { value: "false", count: 2 },
    ]);
  });

  it("offers only options that leave at least one diagnostic", () => {
    const active = filters({ providers: ["pmp"], themes: ["Ocean"] });
    const options = diagnosticFilterOptions(catalog, active);
    const withEachOption = [
      ...options.providers.map((option) =>
        filters({ ...active, providers: [option.value] }),
      ),
      ...options.aftLinks.map((option) =>
        filters({ ...active, aftIds: [option.id] }),
      ),
      ...options.themes.map((option) =>
        filters({ ...active, themes: [option.value] }),
      ),
      ...options.metricValues.map((option) =>
        filters({ ...active, metricValues: option.value === "true" }),
      ),
    ];

    expect(withEachOption.length).toBeGreaterThan(0);
    for (const applied of withEachOption) {
      expect(filterDiagnostics(catalog, applied)).not.toHaveLength(0);
    }
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
