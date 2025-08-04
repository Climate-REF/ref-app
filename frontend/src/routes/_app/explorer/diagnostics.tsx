import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card.tsx";

const Diagnostics = () => {
  return (
    <Card>
      <CardContent className="space-y-4 pt-6">TBD</CardContent>
    </Card>
  );
};

export const Route = createFileRoute("/_app/explorer/diagnostics")({
  component: Diagnostics,
});
