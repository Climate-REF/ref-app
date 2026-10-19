import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { BookOpen, FlaskConical } from "lucide-react";
import { explorerGetThemeOptions } from "@/client/@tanstack/react-query.gen";
import type { ThemeDetail } from "@/client/types.gen";
import { useSelectedMipEra } from "@/components/charts/mipEraContext";
import { Button } from "@/components/ui/button.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { ExplorerThemeLayout } from "./explorerThemeLayout";
import { buildCollectionGroups } from "./mapping";

// Looked up by id rather than imported, as the route's module imports this one
const themesRoute = getRouteApi("/_app/explorer/themes");

const themes = [
  { name: "atmosphere", title: "Atmosphere" },
  { name: "earth-system", title: "Earth System" },
  { name: "impact-and-adaptation", title: "Impact & Adaptation" },
  { name: "land", title: "Land & Land Ice" },
  { name: "ocean", title: "Ocean & Sea Ice" },
] as const;

type ThemeName = (typeof themes)[number]["name"];

/** Swap the collection descriptions between the technical wording and the plain language one. */
export function PlainLanguageToggle({
  plainLanguage,
  setPlainLanguage,
}: {
  plainLanguage: boolean;
  setPlainLanguage: (value: boolean) => void;
}) {
  return (
    <Button
      variant={plainLanguage ? "default" : "outline"}
      size="sm"
      onClick={() => setPlainLanguage(!plainLanguage)}
      className="gap-2 shrink-0"
      title="Toggle between technical descriptions and plain language summaries"
    >
      {plainLanguage ? (
        <BookOpen className="h-4 w-4" />
      ) : (
        <FlaskConical className="h-4 w-4" />
      )}
      {plainLanguage ? "Plain Language" : "Technical"}
    </Button>
  );
}

/** True when at least one collection carries a plain language summary worth toggling to. */
export function hasPlainLanguageContent(theme: ThemeDetail): boolean {
  return theme.collections.some((c) => {
    const pl = c.content?.plain_language;
    return pl?.description || pl?.why_it_matters || pl?.takeaway;
  });
}

function ThemeContent({
  theme,
  plainLanguage,
}: {
  theme: ThemeDetail;
  plainLanguage: boolean;
}) {
  const collectionGroups = buildCollectionGroups(theme);
  return (
    <ExplorerThemeLayout
      collectionGroups={collectionGroups}
      plainLanguage={plainLanguage}
    />
  );
}

export function ThematicContent({ plainLanguage }: { plainLanguage: boolean }) {
  const { theme } = themesRoute.useSearch();
  const navigate = themesRoute.useNavigate();
  const themeObj = themes.find((t) => t.name === theme);
  const selectedMipEra = useSelectedMipEra();

  const { data: themeData } = useSuspenseQuery(
    explorerGetThemeOptions({ path: { theme_slug: theme } }),
  );

  return (
    <>
      <title>{`${themeObj?.title} Explorer${selectedMipEra ? ` (${selectedMipEra})` : ""} - Climate-REF`}</title>
      <div className="space-y-4">
        <Tabs<ThemeName>
          value={theme}
          onValueChange={(value) => {
            navigate({
              to: ".",
              search: (prev) => ({ ...prev, theme: value }),
            });
          }}
        >
          <TabsList className="overflow-x-auto">
            {themes.map((item) => (
              <TabsTrigger<ThemeName> key={item.name} value={item.name}>
                {item.title}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      <div className="mt-6">
        {theme && (
          <ThemeContent theme={themeData} plainLanguage={plainLanguage} />
        )}
      </div>
    </>
  );
}
