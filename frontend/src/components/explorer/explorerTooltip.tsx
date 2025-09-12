import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copyButton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ExplorerTooltipProps {
  showOnHover?: boolean;
  contentItem: any;
}

export const ExplorerTooltip = ({
  contentItem,
  showOnHover,
}: ExplorerTooltipProps) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        className={cn(
          {
            "opacity-0 group-hover:opacity-100 transition-opacity": showOnHover,
          },
          "absolute top-2 right-2 p-1 bg-white/80 hover:bg-white rounded shadow-sm",
        )}
      >
        <Info className="h-3 w-3 text-gray-600" />
      </Button>
    </TooltipTrigger>
    <TooltipContent side="left" className="max-w-md">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Card configuration</p>
          <CopyButton
            text={JSON.stringify(contentItem, null, 2)}
            label="Copy"
          />
        </div>
        <pre className="text-xs bg-gray-800 text-green-400 p-2 rounded overflow-x-auto">
          {JSON.stringify(contentItem, null, 2)}
        </pre>
      </div>
    </TooltipContent>
  </Tooltip>
);
