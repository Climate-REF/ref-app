import { describe, expect, it } from "vitest";
import type { DiagnosticCatalogEntry } from "@/client";
import { withValueFlags } from "./diagnosticCatalog";

const entry = (id: number) => ({ id }) as DiagnosticCatalogEntry;

describe("withValueFlags", () => {
  it("leaves the flags null until they load", () => {
    expect(withValueFlags([entry(1)], undefined)[0]).toMatchObject({
      has_metric_values: null,
      has_scalar_values: null,
      has_series_values: null,
    });
  });

  it("matches the flags to their diagnostic by id", () => {
    const flags = [
      {
        id: 2,
        has_metric_values: false,
        has_scalar_values: false,
        has_series_values: false,
      },
      {
        id: 1,
        has_metric_values: true,
        has_scalar_values: true,
        has_series_values: false,
      },
    ];
    const [first, second] = withValueFlags([entry(1), entry(2)], flags);
    expect(first.has_scalar_values).toBe(true);
    expect(second.has_metric_values).toBe(false);
  });
});
