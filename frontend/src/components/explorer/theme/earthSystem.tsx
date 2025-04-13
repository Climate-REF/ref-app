import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";

export function EarthSystemTheme() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Earth System</CardTitle>
        <CardDescription>
          The atmosphere theme is a dark theme with a blue and purple color
          palette.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Theme Name</p>
            <p className="font-medium">Atmosphere</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Color Palette</p>
            <p className="font-medium">Blue and Purple</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Description</p>
            <p className="font-medium">
              A dark theme with a blue and purple color palette.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
