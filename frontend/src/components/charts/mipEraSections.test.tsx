import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MipEraProvider } from "./mipEraContext";
import { MipEraSections } from "./mipEraSections";

const model = (era: string | undefined, sourceId: string) => {
  const dimensions: Record<string, string> = { source_id: sourceId };
  if (era) dimensions.mip_era = era;
  return { dimensions, kind: "model" as const };
};

/** Four models clears the chart gate, so the era behaviour is what the assertions see. */
const four = (era: string | undefined) =>
  ["ACCESS-CM2", "MIROC6", "GFDL-CM4", "UKESM1-0-LL"].map((id) =>
    model(era, id),
  );

const renderChart = (
  values: ReturnType<typeof model>[],
  mipEra?: "CMIP6" | "CMIP7",
) => {
  const chart = (
    <MipEraSections values={values}>
      {(sectionValues) => (
        <div data-testid="chart">{sectionValues.length} values</div>
      )}
    </MipEraSections>
  );
  return render(
    mipEra ? (
      <MipEraProvider mipEra={mipEra} setMipEra={() => {}}>
        {chart}
      </MipEraProvider>
    ) : (
      chart
    ),
  );
};

describe("MipEraSections without a page selection", () => {
  it("leaves a lone unattributed chart unbadged, since no era is claimed", () => {
    renderChart(four(undefined));
    expect(screen.getAllByTestId("chart")).toHaveLength(1);
    expect(screen.queryByText("MIP era not recorded")).not.toBeInTheDocument();
  });

  it("stacks a badged chart per era", () => {
    renderChart([...four("CMIP6"), ...four("CMIP7")]);
    expect(screen.getAllByTestId("chart")).toHaveLength(2);
    expect(screen.getByText("CMIP6")).toBeInTheDocument();
    expect(screen.getByText("CMIP7")).toBeInTheDocument();
  });
});

describe("MipEraSections with a page selection", () => {
  it("renders only the selected era, without a badge", () => {
    renderChart([...four("CMIP6"), ...four("CMIP7")], "CMIP7");
    expect(screen.getAllByTestId("chart")).toHaveLength(1);
    expect(screen.queryByText("CMIP6")).not.toBeInTheDocument();
  });

  it("says so when the selected era has no data here", () => {
    renderChart(four("CMIP6"), "CMIP7");
    expect(screen.queryByTestId("chart")).not.toBeInTheDocument();
    expect(screen.getByText(/No CMIP7 results yet/)).toBeInTheDocument();
    expect(screen.getByText("Show CMIP6 instead")).toBeInTheDocument();
  });

  it("keeps values no era could be settled for, whichever era is selected", () => {
    renderChart([...four("CMIP6"), ...four(undefined)], "CMIP6");
    expect(screen.getAllByTestId("chart")).toHaveLength(2);
    expect(screen.getByText("MIP era not recorded")).toBeInTheDocument();
  });

  it("shows unattributed values on their own rather than claiming no results", () => {
    renderChart(four(undefined), "CMIP7");
    expect(screen.getAllByTestId("chart")).toHaveLength(1);
    expect(screen.queryByText("No CMIP7 results")).not.toBeInTheDocument();
    // Unbadged here would read as CMIP7 data, which is what the selector says.
    expect(screen.getByText("MIP era not recorded")).toBeInTheDocument();
  });

  it("leaves the selected era unbadged, since the selector already names it", () => {
    renderChart(four("CMIP6"), "CMIP6");
    expect(screen.queryByText("CMIP6")).not.toBeInTheDocument();
  });

  it("still suppresses a chart with too few models", () => {
    renderChart([model("CMIP6", "A"), model("CMIP6", "B")], "CMIP6");
    expect(screen.queryByTestId("chart")).not.toBeInTheDocument();
    expect(screen.getByText("Not enough models to plot")).toBeInTheDocument();
  });
});
