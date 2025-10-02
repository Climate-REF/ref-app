import type { ExplorerCard } from "@/components/explorer/types";
import { ExplorerThemeLayout } from "../explorerThemeLayout";

const cards: ExplorerCard[] = [
  {
    title: "Modes of Variability",
    description:
      "Key metrics for large-scale atmospheric circulation patterns.",
    content: [
      {
        type: "box-whisker-chart",
        provider: "pmp",
        diagnostic: "extratropical-modes-of-variability-nam",
        title: "Northern Annular Mode (NAM) RMSE",
        description:
          "Northern Annular Mode (NAM) individual-model pattern RMSE, see https://doi.org/10.1007/s00382-018-4355-4",
        otherFilters: {
          method: "cbf",
          statistic: "rms",
          domain: "atm-20c-plev-n",
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
        diagnostic: "extratropical-modes-of-variability-sam",
        title: "Southern Annual Mode (SAM) RMSE",
        description:
          "Southern Annual Mode (SAM) individual-model pattern RMSE, see https://doi.org/10.1007/s00382-018-4355-4",
        otherFilters: {
          method: "cbf",
          statistic: "rms",
          domain: "atm-20c-plev-s",
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
        description:
          "North Pacific Gyre Oscillation (NPGO) individual-model pattern RMSE, see https://doi.org/10.1007/s00382-018-4355-4",
        otherFilters: {
          method: "cbf",
          statistic: "rms",
          domain: "atm-20c-plev-n",
        },
        groupingConfig: {
          groupBy: "season",
          hue: "experiment_id",
        },
        yMin: 0,
      },
      {
        type: "box-whisker-chart",
        provider: "pmp",
        diagnostic: "extratropical-modes-of-variability-nao",
        title: "North Atlantic Oscillation (NAO) RMSE",
        description:
          "North Atlantic Oscillation (NAO) individual-model pattern RMSE, see https://doi.org/10.1007/s00382-018-4355-4",
        otherFilters: {
          method: "cbf",
          statistic: "rms",
          domain: "atm-20c-plev-n",
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
        diagnostic: "extratropical-modes-of-variability-pdo",
        title: "Pacific-Decadal Oscillation (PDO) RMSE",
        description:
          "Pacific-Decadal Oscillation (PDO) individual-model pattern RMSE, see https://doi.org/10.1007/s00382-018-4355-4",
        otherFilters: {
          method: "cbf",
          statistic: "rms",
          domain: "atm-20c-plev-n",
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
        diagnostic: "extratropical-modes-of-variability-pna",
        title: "Pacific-North American (PNA) RMSE",
        description:
          "Pacific-North American (PNA) individual-model pattern RMSE, see https://doi.org/10.1007/s00382-018-4355-4",
        otherFilters: {
          method: "cbf",
          statistic: "rms",
          domain: "atm-20c-plev-n",
        },
        groupingConfig: {
          groupBy: "season",
          hue: "season",
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
