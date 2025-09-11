import { ExplorerThemeLayout } from "./_components/explorerThemeLayout";
import type { ExplorerCard } from "@/components/explorer/types";

const cards: ExplorerCard[] = [
  {
    title: "Climate Sensitivity",
    description: "Fundamental metrics of the global climate response to CO2.",
    content: [
      {
        type: "ensemble-chart",
        provider: "esmvaltool",
        diagnostic: "equilibrium-climate-sensitivity",
        title: "ECS",
        metricUnits: "",
        xAxis: "metric",
        clipMax: 10,
      },
      {
        type: "ensemble-chart",
        provider: "esmvaltool",
        diagnostic: "transient-climate-response",
        title: "TCR",
        metricUnits: "K",
      },
      {
        type: "ensemble-chart",
        provider: "esmvaltool",
        diagnostic: "transient-climate-response-emissions",
        title: "TCRE",
        metricUnits: "K/EgC",
      },
      {
        type: "ensemble-chart",
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
    content: [
      {
        type: "ensemble-chart",
        provider: "esmvaltool",
        diagnostic: "enso-basic-climatology",
        title: "ENSO Basic Climatology",
        xAxis: "metric",
      },
      {
        type: "ensemble-chart",
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
