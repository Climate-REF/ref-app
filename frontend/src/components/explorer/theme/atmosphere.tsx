import type { ExplorerCard } from "@/components/explorer/types";
import { LinkExternal } from "@/components/ui/link";
import { ExplorerThemeLayout } from "../explorerThemeLayout";

const cards: ExplorerCard[] = [
  {
    title: "Extratropcial Modes of Variability",
    description: (
      <>
        Spatial comparison of simulated vs. observed leading EOF patterns
        representing the main modes of low-frequency variability in the
        extra-tropical atmosphere and ocean, based on seasonal-mean sea level
        pressure and monthly-mean sea surface temperature anomalies in the
        spatial domains defined in{" "}
        <LinkExternal href="https://doi.org/10.1007/s00382-018-4355-4">
          Lee et al. 2019
        </LinkExternal>
        , Table 1. Simulated EOFs are obtained with the "Common Basis Function"
        (CBF) approach described in the appendix of this article. The considered
        time-period is 1901-2005 for the NH modes and 1951-2005 for the SAM.
      </>
    ),
    content: [
      {
        type: "box-whisker-chart",
        provider: "pmp",
        diagnostic: "extratropical-modes-of-variability-nam",
        title: "Northern Annular Mode (NAM) RMSE",
        description: (
          <>
            Northern Annular Mode (NAM) individual-model pattern RMSE, see{" "}
            <LinkExternal href="https://doi.org/10.1007/s00382-018-4355-4">
              Lee et al. 2019
            </LinkExternal>
          </>
        ),
        otherFilters: {
          method: "cbf",
          statistic: "rms",
          experiment_id: "historical",
        },
        groupingConfig: {
          groupBy: "season",
          hue: "season",
        },
        yMin: 0,
        yMax: 1.5,
      },
      {
        type: "box-whisker-chart",
        provider: "pmp",
        diagnostic: "extratropical-modes-of-variability-sam",
        title: "Southern Annual Mode (SAM) RMSE",
        description: (
          <>
            Southern Annual Mode (SAM) individual-model pattern RMSE, see{" "}
            <LinkExternal href="https://doi.org/10.1007/s00382-018-4355-4">
              Lee et al. 2019
            </LinkExternal>
          </>
        ),
        otherFilters: {
          method: "cbf",
          statistic: "rms",
          experiment_id: "historical",
        },
        groupingConfig: {
          groupBy: "season",
          hue: "season",
        },
        yMin: 0,
        yMax: 1.5,
      },
      {
        type: "box-whisker-chart",
        provider: "pmp",
        diagnostic: "extratropical-modes-of-variability-pna",
        title: "Pacific-North American (PNA) RMSE",
        description: (
          <>
            Pacific-North American (PNA) individual-model pattern RMSE, see{" "}
            <LinkExternal href="https://doi.org/10.1007/s00382-018-4355-4">
              Lee et al. 2019
            </LinkExternal>
          </>
        ),
        otherFilters: {
          method: "cbf",
          statistic: "rms",
          experiment_id: "historical",
        },
        groupingConfig: {
          groupBy: "season",
          hue: "season",
        },
        yMin: 0,
        yMax: 1.5,
      },

      {
        type: "box-whisker-chart",
        provider: "pmp",
        diagnostic: "extratropical-modes-of-variability-nao",
        title: "North Atlantic Oscillation (NAO) RMSE",
        description: (
          <>
            North Atlantic Oscillation (NAO) individual-model pattern RMSE, see{" "}
            <LinkExternal href="https://doi.org/10.1007/s00382-018-4355-4">
              Lee et al. 2019
            </LinkExternal>
          </>
        ),
        otherFilters: {
          method: "cbf",
          statistic: "rms",
          experiment_id: "historical",
        },
        groupingConfig: {
          groupBy: "season",
          hue: "season",
        },
        yMin: 0,
        yMax: 1.5,
      },
      {
        type: "box-whisker-chart",
        provider: "pmp",
        diagnostic: "extratropical-modes-of-variability-pdo",
        title: "Pacific-Decadal Oscillation (PDO) RMSE",
        description: (
          <>
            Pacific-Decadal Oscillation (PDO) individual-model pattern RMSE, see{" "}
            <LinkExternal href="https://doi.org/10.1007/s00382-018-4355-4">
              Lee et al. 2019
            </LinkExternal>
          </>
        ),
        otherFilters: {
          method: "cbf",
          statistic: "rms",
          experiment_id: "historical",
        },
        groupingConfig: {
          groupBy: "season",
          hue: "season",
        },
        yMin: 0,
      },
      {
        type: "box-whisker-chart",
        provider: "pmp",
        diagnostic: "extratropical-modes-of-variability-npgo",
        title: "North Pacific Gyre Oscillation (NPGO) RMSE",
        description: (
          <>
            North Pacific Gyre Oscillation (NPGO) individual-model pattern RMSE,
            see{" "}
            <LinkExternal href="https://doi.org/10.1007/s00382-018-4355-4">
              Lee et al. 2019
            </LinkExternal>
          </>
        ),
        otherFilters: {
          method: "cbf",
          statistic: "rms",
          experiment_id: "historical",
        },
        groupingConfig: {
          groupBy: "season",
          hue: "experiment_id",
        },
        yMin: 0,
      },
    ],
  },
  {
    title: "Cloud & Radiation",
    description:
      "Cloud properties and their effect on the Earth's energy balance.",
    placeholder: true,
    content: [
      {
        type: "box-whisker-chart",
        provider: "esmvaltool",
        description: "Not sure",
        diagnostic: "cloud-radiative-effects",
        title: "Cloud Radiative Effects",
        otherFilters: { statistic: "bias" },
        groupingConfig: {
          groupBy: "metric",
          hue: "metric",
        },
      },
    ],
  },
  // {
  //   title: "Global Mean Timeseries",
  //   description: "Timeseries plots of global mean surface temperature.",
  //   placeholder: true,
  //   content: [
  //     {
  //       type: "figure-gallery",
  //       provider: "esmvaltool",
  //       description: "Examples of a figure gallery",
  //       diagnostic: "global-mean-timeseries",
  //       title: "Global Mean Temperature Timeseries",
  //       span: 2,
  //     },
  //   ],
  // },
];

export function AtmosphereTheme() {
  return <ExplorerThemeLayout cards={cards} />;
}
