import {
  ExplorerCard,
  ExplorerThemeLayout,
} from "./_components/explorerThemeLayout";

const cards: ExplorerCard[] = [
  {
    title: "Ocean State",
    description: "Key indicators of ocean health, circulation, and heat content.",
    charts: [
      {
        provider: "ilamb",
        diagnostic: "amoc-rapid",
        title: "AMOC Strength",
        metricUnits: "Sv",
      },
      {
        provider: "ilamb",
        diagnostic: "ohc-noaa",
        title: "Ocean Heat Content Anomaly",
        metricUnits: "J",
      },
      {
        provider: "ilamb",
        diagnostic: "so-woa2023-surface",
        title: "Sea Surface Salinity",
        metricUnits: "psu",
      },
      {
        provider: "ilamb",
        diagnostic: "thetao-woa2023-surface",
        title: "Sea Surface Temperature",
        metricUnits: "K",
      },
    ],
  },
  {
    title: "Cryosphere",
    description: "The state of Earth's sea ice.",
    charts: [
      {
        provider: "esmvaltool",
        diagnostic: "sea-ice-area-basic",
        title: "Sea Ice Area",
        metricUnits: "km^2",
        xAxis: "region",
      },
    ],
  },
];

export function SeaTheme() {
  return <ExplorerThemeLayout cards={cards} />;
}