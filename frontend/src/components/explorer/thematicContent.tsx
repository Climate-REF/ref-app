import { Button } from "@/components/ui/button.tsx";
import { useSearchParams } from "react-router";

const themes = [
  {
    name: "atmosphere",
    title: "Atmosphere",
    element: <>Test</>,
  },
  {
    name: "earth-system",
    title: "Earth System",
    element: <>Test</>,
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
  const [searchParams, setSearchParams] = useSearchParams();
  const themeName = searchParams.get("theme") ?? "atmosphere";
  const theme = themes.find((theme) => theme.name === themeName);

  const setTheme = (theme: string) => {
    setSearchParams((prev) => {
      prev.set("theme", theme);
      return prev;
    });
  };
  return (
    <>
      <div className="space-x-2">
        {themes.map((item) => (
          <Button
            key={item.title}
            variant={item.name === themeName ? "default" : "outline"}
            onClick={() => setTheme(item.name)}
          >
            {item.title}
          </Button>
        ))}
      </div>
      <div>{theme?.element}</div>
    </>
  );
}
