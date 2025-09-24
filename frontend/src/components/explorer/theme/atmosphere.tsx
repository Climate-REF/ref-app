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
        title: "NAM Bias",
        description: "Northern Annular Mode (NAM) Bias",
        otherFilters: {
          method: "cbf",
          statistic: "bias",
          domain: "atm-20c-plev-n",
        },
        groupingConfig: {
          groupBy: "season",
          hue: "season",
        },
        symmetricalAxes: true,
      },
      {
        type: "box-whisker-chart",
        provider: "pmp",
        diagnostic: "extratropical-modes-of-variability-sam",
        title: "SAM Bias",
        description: "Southern Annular Mode (SAM) Bias",
        otherFilters: {
          method: "cbf",
          statistic: "bias",
          domain: "atm-20c-plev-s",
        },
        groupingConfig: {
          groupBy: "season",
          hue: "season",
        },
        symmetricalAxes: true,
      },
      {
        type: "box-whisker-chart",
        provider: "pmp",
        diagnostic: "extratropical-modes-of-variability-nao",
        title: "NAO Bias",
        otherFilters: {
          method: "cbf",
          statistic: "bias",
          domain: "atm-20c-plev-n",
        },
        groupingConfig: {
          groupBy: "season",
          hue: "season",
        },
        symmetricalAxes: true,
      },
      {
        type: "box-whisker-chart",
        provider: "pmp",
        diagnostic: "extratropical-modes-of-variability-pna",
        title: "PNA Bias",
        otherFilters: {
          method: "cbf",
          statistic: "bias",
          domain: "atm-20c-plev-n",
        },
        groupingConfig: {
          groupBy: "season",
          hue: "season",
        },
        symmetricalAxes: true,
      },
    ],
  },
  {
    title: "Cloud & Radiation",
    description:
      "Cloud properties and their effect on the Earth's energy balance.",
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
  {
    title: "Global Mean Timeseries",
    description: "Timeseries plots of global mean surface temperature.",
    content: [
      {
        type: "figure-gallery",
        provider: "esmvaltool",
        description: "Examples of a figure gallery",
        diagnostic: "global-mean-timeseries",
        title: "Global Mean Temperature Timeseries",
        span: 2,
      },
    ],
  },
];

export function AtmosphereTheme() {
  return <ExplorerThemeLayout cards={cards} />;
}
