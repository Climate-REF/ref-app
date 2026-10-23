import { beforeEach, describe, expect, it, vi } from "vitest";
import { diagnosticsListMetricValues } from "@/client/sdk.gen";
import { downloadBlob } from "@/lib/downloadUtils";
import { chartValuesSearch, downloadChartValues } from "./chartValues";

vi.mock("@/client/sdk.gen", () => ({ diagnosticsListMetricValues: vi.fn() }));
vi.mock("@/lib/downloadUtils", () => ({ downloadBlob: vi.fn() }));

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

  it("leaves out the value type, paging, facets and unset filters", () => {
    const search = chartValuesSearch({
      value_type: "series",
      limit: 500,
      offset: 0,
      with_facets: false,
      mip_era: undefined,
      isolate_ids: null,
    });

    expect(search).toEqual({
      detect_outliers: "iqr",
      include_unverified: "false",
    });
  });
});

describe("downloadChartValues", () => {
  const card = { provider: "ilamb", diagnostic: "amoc" };
  const query = {
    value_type: "scalar" as const,
    limit: 500,
    region: "NWN",
    include_unverified: true,
  };

  beforeEach(() => {
    vi.mocked(diagnosticsListMetricValues).mockReset();
    vi.mocked(downloadBlob).mockReset();
  });

  it("downloads the chart's query as CSV", async () => {
    const blob = new Blob(["a,b"]);
    vi.mocked(diagnosticsListMetricValues).mockResolvedValue({
      data: blob,
      error: undefined,
    } as never);

    await downloadChartValues(card, query);

    expect(diagnosticsListMetricValues).toHaveBeenCalledWith({
      path: { provider_slug: "ilamb", diagnostic_slug: "amoc" },
      query: { ...query, format: "csv" },
      parseAs: "blob",
    });
    expect(downloadBlob).toHaveBeenCalledWith(blob, "ilamb-amoc-values.csv");
  });

  it("throws the error of a failed request without downloading", async () => {
    const error = { detail: "Not found" };
    vi.mocked(diagnosticsListMetricValues).mockResolvedValue({
      data: undefined,
      error,
    } as never);

    await expect(downloadChartValues(card, query)).rejects.toBe(error);
    expect(downloadBlob).not.toHaveBeenCalled();
  });
});
