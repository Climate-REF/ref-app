import { Suspense } from "react";
import {
  ComparisonChartCard,
  ComparisonChartCardSkeleton,
} from "@/components/diagnostics/comparisonChartCard.tsx";

const info = [
  {
    provider: "esmvaltool",
    diagnostic: "transient-climate-response",
    title: "Transient Climate Response Comparison",
  },
];
export const SourceExplorerContent = ({ sourceId }: { sourceId: string }) => {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {info.map((content) => (
        <Suspense
          key={content.diagnostic}
          fallback={<ComparisonChartCardSkeleton />}
        >
          <ComparisonChartCard
            providerSlug={content.provider}
            diagnosticSlug={content.diagnostic}
            sourceFilters={{ source_id: sourceId }}
            metricName={content.title}
            metricUnits="K"
            title={content.title}
          />
        </Suspense>
      ))}
    </div>
  );
};
