import { useNavigate } from "@tanstack/react-router";
import { AtmosphereTheme } from "@/components/explorer/theme/atmosphere.tsx";
import { EarthSystemTheme } from "@/components/explorer/theme/earthSystem.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Route } from "@/routes/_app/explorer.tsx";

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
    title: "Impact And Adaptation",
    element: <>Test</>,
  },
  {
    name: "land",
    title: "Land and Land Ice",
    element: <>Test</>,
  },
  {
    name: "sea",
    title: "Sea and Sea Ice",
    element: <>Test Sea</>,
  },
];

export function ThematicContent() {
  const { theme } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const themeObj = themes.find((t) => t.name === theme);

  const setTheme = (theme: string) => {
    navigate({
      // @ts-ignore
      search: (prev) => ({
        ...prev,
        theme,
      }),
    });
  };
  return (
    <>
      <div className="space-x-2">
        {themes.map((item) => (
          <Button
            key={item.title}
            variant={item.name === theme ? "default" : "outline"}
            onClick={() => setTheme(item.name)}
          >
            {item.title}
          </Button>
        ))}
      </div>
      <div>{themeObj?.element}</div>
    </>
  );
}
