import { describe, expect, it } from "vitest";
import { chartValuesSearch } from "./chartValues";

describe("chartValuesSearch", () => {
  it("keeps the card filters, filter control values and MIP era", () => {
    expect(
      chartValuesSearch({
        value_type: "scalar",
        limit: 500,
        mip_era: "CMIP7",
        region: "NWN",
        statistic: "Bias",
        detect_outliers: "iqr",
        include_unverified: true,
      }),
    ).toEqual({
      mip_era: "CMIP7",
      region: "NWN",
      statistic: "Bias",
      detect_outliers: "iqr",
      include_unverified: "true",
    });
  });

  it("leaves out the value type, paging and unset filters", () => {
    const search = chartValuesSearch({
      value_type: "series",
      limit: 500,
      offset: 0,
      mip_era: undefined,
      isolate_ids: null,
    });

    expect(search).toEqual({
      detect_outliers: "iqr",
      include_unverified: "false",
    });
  });
});
