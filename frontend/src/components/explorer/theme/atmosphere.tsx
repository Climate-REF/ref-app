import type { ExplorerCard } from "@/components/explorer/types";
import { ExplorerThemeLayout } from "./_components/explorerThemeLayout";

const cards: ExplorerCard[] = [
  {
    title: "Modes of Variability",
    description:
      "Key metrics for large-scale atmospheric circulation patterns.",
    content: [
      {
        type: "ensemble-chart",
        provider: "pmp",
        diagnostic: "extratropical-modes-of-variability-nam",
        title: "NAM Bias",
        otherFilters: {
          method: "cbf",
          statistic: "bias",
          domain: "atm-20c-plev-n",
        },
      },
      {
        type: "ensemble-chart",
        provider: "pmp",
        diagnostic: "extratropical-modes-of-variability-sam",
        title: "SAM Bias",
        otherFilters: {
          method: "cbf",
          statistic: "bias",
          domain: "atm-20c-plev-s",
        },
      },
      {
        type: "ensemble-chart",
        provider: "pmp",
        diagnostic: "extratropical-modes-of-variability-nao",
        title: "NAO Bias",
        otherFilters: {
          method: "cbf",
          statistic: "bias",
          domain: "atm-20c-plev-n",
        },
      },
      {
        type: "ensemble-chart",
        provider: "pmp",
        diagnostic: "extratropical-modes-of-variability-pna",
        title: "PNA Bias",
        otherFilters: {
          method: "cbf",
          statistic: "bias",
          domain: "atm-20c-plev-n",
        },
      },
    ],
  },
  {
    title: "Cloud & Radiation",
    description:
      "Cloud properties and their effect on the Earth's energy balance.",
    content: [
      {
        type: "ensemble-chart",
        provider: "esmvaltool",
        diagnostic: "cloud-radiative-effects",
        title: "Cloud Radiative Effects",
        otherFilters: { statistic: "bias" },
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
