import { Link } from "@tanstack/react-router";
import { AtmosphereTheme } from "@/components/explorer/theme/atmosphere";
import { EarthSystemTheme } from "@/components/explorer/theme/earthSystem";
import { ImpactAndAdaptationTheme } from "@/components/explorer/theme/impactAndAdaptation";
import { LandTheme } from "@/components/explorer/theme/land";
import { SeaTheme } from "@/components/explorer/theme/sea";
import { Button } from "@/components/ui/button.tsx";
import { Route } from "@/routes/_app/explorer/themes.tsx";

const themes = [
  {
    name: "atmosphere",
    title: "Atmosphere",
    element: <AtmosphereTheme />,
  },
  {
    name: "earth-system",
    title: "Earth System",
    element: <EarthSystemTheme />,
  },
  {
    name: "impact-and-adaptation",
    title: "Impact and Adaptation",
    element: <ImpactAndAdaptationTheme />,
  },
  {
    name: "land",
    title: "Land and Land Ice",
    element: <LandTheme />,
  },
  {
    name: "ocean",
    title: "Ocean and Sea Ice",
    element: <SeaTheme />,
  },
];

export function ThematicContent() {
  const { theme } = Route.useSearch();
  const themeObj = themes.find((t) => t.name === theme);
  return (
    <>
      <div className="space-x-2">
        {themes.map((item) => (
          <Link
            key={item.name}
            to={Route.fullPath}
            // @ts-expect-error Incorrect type for search
            search={{ theme: item.name }}
          >
            <Button
              key={item.title}
              variant={item.name === theme ? "default" : "outline"}
            >
              {item.title}
            </Button>
          </Link>
        ))}
      </div>
      <div>{themeObj?.element}</div>
    </>
  );
}
