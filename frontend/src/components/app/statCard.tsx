import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** A headline number in a card, with an optional line explaining it. */
export function StatCard({
  title,
  value,
  hint,
  loading = false,
}: {
  title: string;
  value: string;
  hint?: string;
  /** Show a placeholder in place of the value while it loads */
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm leading-none font-semibold">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{loading ? "..." : value}</div>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
