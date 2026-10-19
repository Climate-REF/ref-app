import { describe, expect, it } from "vitest";
import type { CmipDatasetMetadata } from "@/client";
import { collectFacets } from "./datasetFacets";

const metadata = (
  source_id: string,
  experiment_id: string,
): CmipDatasetMetadata => ({
  source_id,
  experiment_id,
  variable_id: "tas",
  variant_label: "r1i1p1f1",
});

describe("collectFacets", () => {
  it("lists each facet's values once, in the order they first appear", () => {
    expect(
      collectFacets([
        { metadata: metadata("CESM2", "historical") },
        { metadata: metadata("ACCESS-ESM1-5", "historical") },
        { metadata: metadata("CESM2", "ssp585") },
      ]),
    ).toEqual({
      source_id: ["CESM2", "ACCESS-ESM1-5"],
      experiment_id: ["historical", "ssp585"],
      variable_id: ["tas"],
      variant_label: ["r1i1p1f1"],
    });
  });

  it("skips datasets without metadata", () => {
    expect(collectFacets([{ metadata: null }])).toEqual({});
    expect(
      collectFacets([{ metadata: null }, { metadata: metadata("A", "B") }])
        .source_id,
    ).toEqual(["A"]);
  });

  it("is empty without datasets", () => {
    expect(collectFacets([])).toEqual({});
  });
});
