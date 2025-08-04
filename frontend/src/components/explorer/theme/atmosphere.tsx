import {
  ExplorerCard,
  ExplorerThemeLayout,
} from "./_components/explorerThemeLayout";

const cards: ExplorerCard[] = [
  {
    title: "Modes of Variability",
    description:
      "Key metrics for large-scale atmospheric circulation patterns.",
    charts: [
      {
        provider: "pmp",
        diagnostic: "extratropical-modes-of-variability-nam",
        title: "NAM Bias",
        otherFilters: {
          method: "cbf",
        },
        xAxis: "statistic",
      },
      {
        provider: "pmp",
        diagnostic: "extratropical-modes-of-variability-sam",
        title: "SAM Bias",
        otherFilters: {
          method: "cbf",
          statistic: "bias",
        },
      },
      {
        provider: "pmp",
        diagnostic: "extratropical-modes-of-variability-nao",
        title: "NAO Bias",
        otherFilters: {
          method: "cbf",
          statistic: "bias",
        },
      },
      {
        provider: "pmp",
        diagnostic: "extratropical-modes-of-variability-pna",
        title: "PNA Bias",
        otherFilters: {
          method: "cbf",
          statistic: "bias",
        },
      },
    ],
  },
  {
    title: "Cloud & Radiation",
    description:
      "Cloud properties and their effect on the Earth's energy balance.",
    charts: [
      {
        provider: "esmvaltool",
        diagnostic: "cloud-radiative-effects",
        title: "Cloud Radiative Effects",
        otherFilters: { statistic: "bias" },
      },
    ],
  },
];

export function AtmosphereTheme() {
  return <ExplorerThemeLayout cards={cards} />;
}
