import { Copy, Download, Eye, EyeOff } from "lucide-react";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { ErrorBoundary } from "@/components/app/errorBoundary";
import type {
  MetricValue,
  SeriesValue,
} from "@/components/execution/values/types";
import type { ChartGroupingConfig } from "@/components/explorer/grouping";
import {
  extractAvailableDimensions,
  GroupingControls,
  initializeGroupingConfig,
} from "@/components/explorer/grouping";
import type { ExplorerCardContent as ExplorerCardContentType } from "@/components/explorer/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { CopyButton } from "@/components/ui/copyButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { ErrorFallback } from "../app/errorFallback";
import {
  ExplorerCardContent,
  ExplorerCardContentSkeleton,
} from "../explorer/explorerCardContent";

interface CardTemplateGeneratorProps {
  providerSlug: string;
  diagnosticSlug: string;
  // Current filter state from the diagnostic page
  currentFilters?: Record<string, string>;
  // Current grouping configuration from the diagnostic page
  currentGroupingConfig?: ChartGroupingConfig;
  // Available data from the current diagnostic page (used to extract dimensions)
  availableData?: (MetricValue | SeriesValue)[];
  // Current tab context to determine default card type
  currentTab?: "values" | "series" | "figures";
  // Current view type within the values tab
  currentViewType?: "table" | "bar" | "series";
}

type CardType = "box-whisker-chart" | "figure-gallery" | "series-chart";

/// Preview component for the generated card template
const PreviewExplorerCard = ({
  contentItem,
}: {
  contentItem: ExplorerCardContentType;
}) => {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <Suspense fallback={<ExplorerCardContentSkeleton />}>
        <ExplorerCardContent contentItem={contentItem} />
      </Suspense>
    </ErrorBoundary>
  );
};

export function CardTemplateGenerator({
  providerSlug,
  diagnosticSlug,
  currentFilters = {},
  currentGroupingConfig,
  availableData = [],
  currentTab,
  currentViewType,
}: CardTemplateGeneratorProps) {
  const { toast } = useToast();
  const [isVisible, setIsVisible] = useState(true); // Start visible for testing

  // Extract available dimensions from the data
  const availableDimensions = useMemo(() => {
    if (availableData.length === 0)
      return {
        dimensions: [],
        defaultGroupBy: "none",
        defaultHue: "none",
        defaultStyle: "none",
      };
    return extractAvailableDimensions(availableData);
  }, [availableData]);

  // Form state - set default based on current tab and view context
  const getDefaultCardType = (): CardType => {
    if (currentTab === "figures") return "figure-gallery";
    if (currentTab === "values") {
      if (currentViewType === "series") return "series-chart";
      if (currentViewType === "bar") return "box-whisker-chart";
      return "box-whisker-chart"; // Default for table view
    }
    return "box-whisker-chart"; // Default fallback
  };

  const [cardType, setCardType] = useState<CardType>(getDefaultCardType());
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [metricUnits, setMetricUnits] = useState("");
  const [clipMin, setClipMin] = useState<number | undefined>();
  const [clipMax, setClipMax] = useState<number | undefined>();
  const [span, setSpan] = useState<1 | 2>(1);
  const [includeFilters, setIncludeFilters] = useState<string[]>([]);
  const [symmetricalAxes, setSymmetricalAxes] = useState(false);

  // Unified grouping configuration state
  const [groupingConfig, setGroupingConfig] = useState<ChartGroupingConfig>(
    () => {
      return initializeGroupingConfig(
        availableDimensions,
        currentGroupingConfig,
      );
    },
  );

  // Sync card generator grouping with main chart grouping changes
  useEffect(() => {
    if (currentGroupingConfig) {
      const syncedConfig = initializeGroupingConfig(
        availableDimensions,
        currentGroupingConfig,
      );
      setGroupingConfig(syncedConfig);
    }
  }, [currentGroupingConfig, availableDimensions]);

  // Handle grouping configuration changes
  const handleGroupingChange = useCallback((newConfig: ChartGroupingConfig) => {
    setGroupingConfig(newConfig);
  }, []);

  // Generate the card template
  const generateTemplate = useCallback((): ExplorerCardContentType => {
    const selectedFilters = Object.fromEntries(
      includeFilters
        .map((key) => [key, currentFilters[key]])
        .filter(([, value]) => value),
    );

    const baseContent = {
      provider: providerSlug,
      diagnostic: diagnosticSlug,
      title,
      description,
      span,
    };

    let content: ExplorerCardContentType;

    switch (cardType) {
      case "box-whisker-chart":
        content = {
          type: "box-whisker-chart",
          ...baseContent,
          metricUnits: metricUnits || "unitless",
          ...(clipMin !== undefined && { clipMin }),
          ...(clipMax !== undefined && { clipMax }),
          ...(symmetricalAxes && { symmetricalAxes }),
          ...(Object.keys(selectedFilters).length > 0 && {
            otherFilters: selectedFilters,
          }),
          // Use unified grouping configuration
          groupingConfig: {
            ...(groupingConfig.groupBy &&
              groupingConfig.groupBy !== "none" && {
                groupBy: groupingConfig.groupBy,
              }),
            ...(groupingConfig.hue &&
              groupingConfig.hue !== "none" && { hue: groupingConfig.hue }),
            ...(groupingConfig.style &&
              groupingConfig.style !== "none" && {
                style: groupingConfig.style,
              }),
          },
        };
        break;

      case "figure-gallery":
        content = {
          type: "figure-gallery",
          ...baseContent,
        };
        break;

      case "series-chart":
        content = {
          type: "series-chart",
          ...baseContent,
          metricUnits: metricUnits || "unitless",
          ...(symmetricalAxes && { symmetricalAxes }),
          ...(Object.keys(selectedFilters).length > 0 && {
            otherFilters: selectedFilters,
          }),
          // Use unified grouping configuration
          groupingConfig: {
            ...(groupingConfig.groupBy &&
              groupingConfig.groupBy !== "none" && {
                groupBy: groupingConfig.groupBy,
              }),
            ...(groupingConfig.hue &&
              groupingConfig.hue !== "none" && { hue: groupingConfig.hue }),
            ...(groupingConfig.style &&
              groupingConfig.style !== "none" && {
                style: groupingConfig.style,
              }),
          },
        };
        break;
    }

    return content;
  }, [
    cardType,
    title,
    description,
    metricUnits,
    clipMin,
    clipMax,
    span,
    includeFilters,
    currentFilters,
    providerSlug,
    diagnosticSlug,
    groupingConfig,
    symmetricalAxes,
  ]);

  // Copy template to clipboard
  const copyTemplate = useCallback(async () => {
    const template = generateTemplate();
    const templateString = JSON.stringify(template, null, 2);

    try {
      await navigator.clipboard.writeText(templateString);
      toast({
        title: "Template copied!",
        description: "The card template has been copied to your clipboard.",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Failed to copy template to clipboard.",
        variant: "destructive",
      });
    }
  }, [generateTemplate, toast]);

  // Download template as JSON file
  const downloadTemplate = useCallback(() => {
    const template = generateTemplate();
    const templateString = JSON.stringify(template, null, 2);
    const blob = new Blob([templateString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `card-template-${providerSlug}-${diagnosticSlug}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Template downloaded!",
      description: "The card template has been saved as a JSON file.",
    });
  }, [generateTemplate, providerSlug, diagnosticSlug, toast]);

  if (!isVisible) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsVisible(true)}
        className="w-full"
      >
        <Eye className="h-4 w-4 mr-2" />
        Show Template Generator
      </Button>
    );
  }

  return (
    <Card className="w-full shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Configure Card Template</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setIsVisible(false)}>
            <EyeOff className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Configure a card template for the data explorer
        </p>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Column */}
          <div className="space-y-4">
            {/* Card Type Selection */}
            <div className="space-y-2">
              <Label htmlFor="cardType">Card Type</Label>
              <Select
                value={cardType}
                onValueChange={(value: CardType) => setCardType(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="box-whisker-chart">
                    Box and Whisker Chart
                  </SelectItem>
                  <SelectItem value="figure-gallery">Figure Gallery</SelectItem>
                  <SelectItem value="series-chart">Series Chart</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Basic Information */}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter card title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setDescription(e.target.value)
                }
                placeholder="Optional description for the card"
                rows={2}
              />
            </div>

            {/* Chart-specific options */}
            {(cardType === "box-whisker-chart" ||
              cardType === "series-chart") && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="metricUnits">Metric Units</Label>
                  <Input
                    id="metricUnits"
                    value={metricUnits}
                    onChange={(e) => setMetricUnits(e.target.value)}
                    placeholder="e.g., K, mm/day, unitless"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="clipMin">Clip Min</Label>
                    <Input
                      id="clipMin"
                      type="number"
                      value={clipMin || ""}
                      onChange={(e) =>
                        setClipMin(
                          e.target.value ? Number(e.target.value) : undefined,
                        )
                      }
                      placeholder="Optional"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clipMax">Clip Max</Label>
                    <Input
                      id="clipMax"
                      type="number"
                      value={clipMax || ""}
                      onChange={(e) =>
                        setClipMax(
                          e.target.value ? Number(e.target.value) : undefined,
                        )
                      }
                      placeholder="Optional"
                    />
                  </div>
                </div>

                {/* Unified Grouping Configuration */}
                {availableDimensions.dimensions.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">
                        Chart Configuration
                      </Label>
                      <GroupingControls
                        config={groupingConfig}
                        availableDimensions={availableDimensions}
                        onChange={handleGroupingChange}
                        className="border-0 shadow-none p-0"
                      />
                    </div>
                  </>
                )}

                {/* Symmetrical Axes */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="symmetricalAxes"
                    checked={symmetricalAxes}
                    onCheckedChange={(checked) =>
                      setSymmetricalAxes(checked === true)
                    }
                  />
                  <Label
                    htmlFor="symmetricalAxes"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Symmetrical Axes
                  </Label>
                </div>
              </>
            )}

            {/* Layout Options */}
            <div className="space-y-2">
              <Label htmlFor="span">Card Width</Label>
              <Select
                value={span.toString()}
                onValueChange={(value) => setSpan(Number(value) as 1 | 2)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Single Column</SelectItem>
                  <SelectItem value="2">Double Column</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Current Filters */}
            {Object.keys(currentFilters).length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Include Current Filters
                  </Label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {Object.entries(currentFilters).map(([key, value]) => (
                      <div key={key} className="flex items-center space-x-2">
                        <Checkbox
                          id={`filter-${key}`}
                          checked={includeFilters.includes(key)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setIncludeFilters((prev) => [...prev, key]);
                            } else {
                              setIncludeFilters((prev) =>
                                prev.filter((k) => k !== key),
                              );
                            }
                          }}
                        />
                        <Label
                          htmlFor={`filter-${key}`}
                          className="text-xs flex-1"
                        >
                          <Badge variant="secondary" className="text-xs">
                            {key}: {value}
                          </Badge>
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Current Configuration Display */}
            <Separator />
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Current Configuration
              </Label>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>
                  <strong>Provider:</strong> {providerSlug}
                </div>
                <div>
                  <strong>Diagnostic:</strong> {diagnosticSlug}
                </div>
                <div>
                  <strong>Type:</strong> {cardType}
                </div>
                {title && (
                  <div>
                    <strong>Title:</strong> {title}
                  </div>
                )}
                {includeFilters.length > 0 && (
                  <div>
                    <strong>Filters:</strong> {includeFilters.join(", ")}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={copyTemplate}
                disabled={!title}
                size="sm"
                className="flex-1"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
              <Button
                onClick={downloadTemplate}
                disabled={!title}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>

            <div className="text-xs text-muted-foreground">
              Copy the template and send it to the developer to include in the
              data explorer.
            </div>
          </div>

          {/* Preview Column */}
          <div className="space-y-4 col-span-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Live Preview</Label>
              <p className="text-xs text-muted-foreground">
                This is how your card will appear in the data explorer
              </p>
            </div>

            <div className="border rounded-lg p-4 bg-white min-h-[400px]">
              {title ? (
                <TooltipProvider>
                  <PreviewExplorerCard contentItem={generateTemplate()} />
                </TooltipProvider>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <p className="text-sm">Preview will appear here</p>
                    <p className="text-xs mt-1">
                      Enter a title to see the preview
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Template JSON Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  Generated Template
                </Label>
                {title && (
                  <CopyButton
                    text={JSON.stringify(generateTemplate(), null, 2)}
                    label="Copy JSON"
                  />
                )}
              </div>
              <ErrorBoundary
                fallback={
                  <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded text-xs">
                    Error generating template JSON. Please check your
                    configuration.
                  </div>
                }
              >
                <div className="bg-gray-900 text-green-400 p-3 rounded text-xs font-mono max-h-48 overflow-y-auto">
                  <pre>
                    {title
                      ? JSON.stringify(generateTemplate(), null, 2)
                      : "// Template will appear here when you enter a title"}
                  </pre>
                </div>
              </ErrorBoundary>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
