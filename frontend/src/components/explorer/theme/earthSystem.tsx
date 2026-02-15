import type { ExplorerCard } from "@/components/explorer/types";
import { ExplorerThemeLayout } from "../explorerThemeLayout";

const cards: ExplorerCard[] = [
  {
    title: "Climate Sensitivity",
    description: "Fundamental metrics of the global climate response to CO2.",
    content: [
      {
        type: "box-whisker-chart",
        provider: "esmvaltool",
        diagnostic: "equilibrium-climate-sensitivity",
        title: "Equilibrium Climate Sensitivity (ECS)",
        description:
          "ECS represents the long-term change in global mean surface temperature following a doubling of atmospheric CO2 concentrations. It is a key metric for understanding the sensitivity of Earth's climate system to radiative forcing and is crucial for predicting future climate change and informing policy decisions. ECS is influenced by various feedback mechanisms, including water vapor, clouds, and ice-albedo feedbacks, which can amplify or dampen the initial warming response.",
        interpretation:
          "Higher ECS values indicate a more sensitive climate system, leading to greater warming for a given increase in CO2.",
        metricUnits: "",
        clipMax: 10,
        otherFilters: { metric: "ecs" },
        groupingConfig: {
          groupBy: "metric",
          hue: "metric",
        },
      },
      {
        type: "box-whisker-chart",
        provider: "esmvaltool",
        diagnostic: "equilibrium-climate-sensitivity",
        title: "Lambda",
        description:
          "Climate feedback parameter (λ) quantifies the sensitivity of Earth's climate system to radiative forcing, representing the change in global mean surface temperature per unit of radiative forcing (W/m²). It is a key metric for understanding the balance between incoming solar radiation and outgoing terrestrial radiation, influencing how the climate responds to factors such as greenhouse gas concentrations and aerosols. ",
        interpretation:
          "A more negative λ value indicates that the climate system has stronger stabilizing feedbacks, which help to counteract warming and maintain equilibrium. Conversely, a less negative or positive λ suggests that the climate system is more sensitive to perturbations, potentially leading to amplified warming in response to increased greenhouse gas concentrations.",
        metricUnits: "W/m²/K",
        clipMax: 10,
        otherFilters: { metric: "lambda" },
        groupingConfig: {
          groupBy: "metric",
          hue: "metric",
        },
      },
      {
        type: "box-whisker-chart",
        provider: "esmvaltool",
        diagnostic: "transient-climate-response",
        title: "Transient Climate Response (TCR)",
        description:
          "TCR measures the immediate warming response of the climate system to a sustained increase in CO2 concentrations. It is a key metric for understanding the short-term impacts of greenhouse gas emissions on global temperatures and is critical for informing climate policy and adaptation strategies.",
        interpretation:
          "Higher TCR values indicate a more sensitive climate system, leading to greater warming in the near term for a given increase in CO2.",
        metricUnits: "K",
        groupingConfig: {
          groupBy: "metric",
          hue: "metric",
        },
      },
      {
        type: "box-whisker-chart",
        provider: "esmvaltool",
        diagnostic: "transient-climate-response-emissions",
        title: "Transient Climate Response to Emissions (TCRE)",
        description: (
          <>
            TCRE quantifies the change in global mean surface temperature per
            1000 GtC of cumulative CO2 emissions. It reflects the near-linear
            relationship between cumulative carbon emissions and global warming,
            highlighting the direct impact of human activities on climate
            change. TCRE is a crucial metric for setting carbon budgets and
            informing climate policy, as it helps estimate the allowable
            emissions to limit global temperature rise to specific targets, such
            as those outlined in the Paris Agreement.
            <span className="text-red-500">
              Data to be available in next week
            </span>
          </>
        ),
        interpretation:
          "Higher TCRE values indicate a more sensitive climate system, leading to greater warming for a given amount of CO2 emissions.",
        metricUnits: "K/EgC",
        groupingConfig: {
          groupBy: "metric",
          hue: "metric",
        },
      },
      {
        type: "box-whisker-chart",
        provider: "esmvaltool",
        diagnostic: "zero-emission-commitment",
        title: "Zero Emission Commitment (ZEC)",
        description: (
          <>
            ZEC represents the long-term change in global mean surface
            temperature following the cessation of CO2 emissions after a
            sustained period of increase. It reflects the balance between
            ongoing ocean heat uptake and the reduction in radiative forcing due
            to decreasing atmospheric CO2 levels. This metric is important for
            understanding the long-term climate implications of emission
            scenarios and for informing climate policy.
            <span className="text-red-500">
              Data to be available in next week
            </span>
          </>
        ),
        interpretation:
          "A negative ZEC indicates that the climate system has stabilizing feedbacks that help to counteract warming after emissions cease. Conversely, a positive ZEC suggests that the climate system may continue to warm even after emissions stop.",
        metricUnits: "K",
        groupingConfig: {
          groupBy: "metric",
          hue: "metric",
        },
      },
    ],
  },
  {
    title: "El Niño-Southern Oscillation (ENSO)",
    description:
      "Characteristics of ENSO, the dominant mode of interannual climate variability, which influences global weather patterns, precipitation, and temperature extremes.",
    content: [],
    placeholder: true,
  },
];

export function EarthSystemTheme() {
  return <ExplorerThemeLayout cards={cards} />;
}
