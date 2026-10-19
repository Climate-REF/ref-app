import { describe, expect, it } from "vitest";
import { datasetColumns } from "./datasetColumns";

const ids = (sourceType?: string) =>
  datasetColumns(sourceType).map(
    (column) => column.id ?? (column as { accessorKey?: string }).accessorKey,
  );

describe("datasetColumns", () => {
  it("adds the CMIP facets for a CMIP source type", () => {
    expect(ids("cmip6")).toEqual([
      "slug",
      "dataset_type",
      "experiment_id",
      "source_id",
      "variable_id",
      "esgf_link",
    ]);
  });

  it("has only the common columns for another source type or a mix of them", () => {
    const common = ["slug", "dataset_type", "esgf_link"];
    expect(ids("obs4mips")).toEqual(common);
    expect(ids()).toEqual(common);
  });
});
