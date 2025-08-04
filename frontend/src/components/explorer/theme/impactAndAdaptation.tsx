import {
  ExplorerCard,
  ExplorerThemeLayout,
} from "./_components/explorerThemeLayout";

const cards: ExplorerCard[] = [
    {
    title: "Warming Levels",
    description: "Climate conditions at different global warming levels, relevant to policy targets.",
    content: [
      {
        type: "ensemble-chart",
        provider: "esmvaltool",
        diagnostic: "climate-at-global-warming-levels",
        title: "Global Mean Temperature Change at Warming Levels",
        metricUnits: "K",
        xAxis: "warming_level",
      },
    ],
  },
];

export function ImpactAndAdaptationTheme() {
  return <ExplorerThemeLayout cards={cards} />;
}