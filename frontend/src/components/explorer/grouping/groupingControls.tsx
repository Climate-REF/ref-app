import { HelpCircle } from "lucide-react";
import { useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AvailableDimensions, ChartGroupingConfig } from "./types";

interface GroupingControlsProps {
  config: ChartGroupingConfig;
  availableDimensions: AvailableDimensions;
  onChange: (config: ChartGroupingConfig) => void;
  className?: string;
  showStyle?: boolean;
}

export function GroupingControls({
  config,
  availableDimensions,
  onChange,
  className = "",
  showStyle = true,
}: GroupingControlsProps) {
  const handleGroupByChange = useCallback(
    (value: string) => {
      onChange({ ...config, groupBy: value });
    },
    [config, onChange],
  );

  const handleHueChange = useCallback(
    (value: string) => {
      onChange({ ...config, hue: value });
    },
    [config, onChange],
  );

  const handleStyleChange = useCallback(
    (value: string) => {
      onChange({ ...config, style: value });
    },
    [config, onChange],
  );

  return (
    <TooltipProvider>
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium text-muted-foreground">
                  Group:
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Controls how data is organized into categories on the
                      chart. For scalar charts, this determines the x-axis
                      grouping. For series charts, this affects legend
                      categorization.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Select
                value={config.groupBy || "none"}
                onValueChange={handleGroupByChange}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {availableDimensions.dimensions.map((dim) => (
                    <SelectItem key={dim} value={dim}>
                      {dim}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium text-muted-foreground">
                  Color:
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Controls how data points are colored based on a dimension.
                      Different values of this dimension will be assigned
                      different colors to help distinguish between data series
                      or groups.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Select
                value={config.hue || "none"}
                onValueChange={handleHueChange}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {availableDimensions.dimensions.map((dim) => (
                    <SelectItem key={dim} value={dim}>
                      {dim}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium text-muted-foreground">
                  Style:
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Controls visual styling like line dash patterns for series
                      charts. Different values of this dimension will be
                      assigned different visual styles to provide additional
                      differentiation.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              {showStyle && (
                <Select
                  value={config.style || "none"}
                  onValueChange={handleStyleChange}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {availableDimensions.dimensions.map((dim) => (
                      <SelectItem key={dim} value={dim}>
                        {dim}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Summary of current configuration */}
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground">
                {config.groupBy && config.groupBy !== "none" && (
                  <span>
                    Groups by <strong>{config.groupBy}</strong>
                  </span>
                )}
                {config.hue && config.hue !== "none" && (
                  <span>
                    {config.groupBy && config.groupBy !== "none" ? ", " : ""}
                    Colors by <strong>{config.hue}</strong>
                  </span>
                )}
                {config.style && config.style !== "none" && (
                  <span>
                    {(config.groupBy && config.groupBy !== "none") ||
                    (config.hue && config.hue !== "none")
                      ? ", "
                      : ""}
                    Styles by <strong>{config.style}</strong>
                  </span>
                )}
                {(!config.groupBy || config.groupBy === "none") &&
                  (!config.hue || config.hue === "none") &&
                  (!config.style || config.style === "none") && (
                    <span>Using default grouping and styling</span>
                  )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
