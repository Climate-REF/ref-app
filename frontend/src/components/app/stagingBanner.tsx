import { FlaskConical } from "lucide-react";
import { useStagingMode } from "@/hooks/useStagingMode";

/**
 * Names the site as staging, where results are shown no matter how few models contributed.
 */
export function StagingBanner() {
  const isStaging = useStagingMode();

  if (!isStaging) return null;

  return (
    <div className="bg-amber-500 text-amber-950 px-4 py-2 text-center text-sm font-medium">
      <span className="inline-flex items-center gap-2">
        <FlaskConical className="h-4 w-4" />
        Staging site. Results are shown even where too few models have run for
        them to be read as evidence.
      </span>
    </div>
  );
}
