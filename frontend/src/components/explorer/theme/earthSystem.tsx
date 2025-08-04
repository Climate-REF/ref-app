import {
  ExplorerCard,
  ExplorerThemeLayout,
} from "./_components/explorerThemeLayout";

const cards: ExplorerCard[] = [
  {
    title: "Climate Sensitivity",
    description: "Fundamental metrics of the global climate response to CO2.",
    charts: [
      {
        provider: "esmvaltool",
        diagnostic: "equilibrium-climate-sensitivity",
        title: "ECS",
        metricUnits: "",
        xAxis: "metric",
        clipMax: 10,
      },
      {
        provider: "esmvaltool",
        diagnostic: "transient-climate-response",
        title: "TCR",
        metricUnits: "K",
      },
      {
        provider: "esmvaltool",
        diagnostic: "transient-climate-response-emissions",
        title: "TCRE",
        metricUnits: "K/EgC",
      },
      {
        provider: "esmvaltool",
        diagnostic: "zero-emission-commitment",
        title: "ZEC",
        metricUnits: "K",
      },
    ],
  },
  {
    title: "El Niño-Southern Oscillation",
    description:
      "Characteristics of the primary driver of interannual climate variability.",
    charts: [
      {
        provider: "esmvaltool",
        diagnostic: "enso-basic-climatology",
        title: "ENSO Basic Climatology",
        xAxis: "metric",
      },
      {
        provider: "pmp",
        diagnostic: "enso_tel",
        title: "ENSO Teleconnections",
        xAxis: "metric",
      },
    ],
  },
];

export function EarthSystemTheme() {
  return <ExplorerThemeLayout cards={cards} />;
}
