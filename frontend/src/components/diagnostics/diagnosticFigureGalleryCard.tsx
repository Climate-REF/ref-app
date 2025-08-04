import { useSuspenseQuery } from "@tanstack/react-query";
import { diagnosticsListExecutionGroupsOptions } from "@/client/@tanstack/react-query.gen";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { DiagnosticFigureGallery } from "./diagnosticFigureGallery.tsx";

interface DiagnosticFigureGalleryCardProps {
  providerSlug: string;
  diagnosticSlug: string;
  title: string;
  description?: string;
}

export const DiagnosticFigureGalleryCardSkeleton = () => {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 w-3/4 bg-gray-200 animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="h-64 bg-gray-200 animate-pulse" />
      </CardContent>
    </Card>
  );
};

export function DiagnosticFigureGalleryCard(
  props: DiagnosticFigureGalleryCardProps,
) {
  const { providerSlug, diagnosticSlug, title, description } = props;

  const { data } = useSuspenseQuery(
    diagnosticsListExecutionGroupsOptions({
      path: { provider_slug: providerSlug, diagnostic_slug: diagnosticSlug },
    }),
  );

  const executions = data.data.flatMap((group) => group.executions);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <DiagnosticFigureGallery executions={executions} />
      </CardContent>
    </Card>
  );
}
