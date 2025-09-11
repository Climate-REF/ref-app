import { Copy, Download, Eye, EyeOff } from "lucide-react";
import { useCallback, useState } from "react";
import { ErrorBoundary } from "@/components/app/errorBoundary";
import type {
  MetricValue,
  SeriesValue,
} from "@/components/execution/values/types";
import { ExplorerCardPreview } from "@/components/explorer/explorerCardPreview";
import type {
  ExplorerCardContent,
  ExplorerCard as ExplorerCardType,
} from "@/components/explorer/types";
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

interface CardTemplateGeneratorProps {
  providerSlug: string;
  diagnosticSlug: string;
  // Current filter state from the diagnostic page
  currentFilters?: Record<string, string>;
  // Current series visualization parameters
  seriesParams?: {
    groupBy?: string;
    hue?: string;
    style?: string;
  };
  // Available dimensions for series configuration
  availableDimensions?: string[];
  // Available data from the current diagnostic page
  availableData?: (MetricValue | SeriesValue)[];
  // Current tab context to determine default card type
  currentTab?: "values" | "series" | "figures";
  // Current view type within the values tab
  currentViewType?: "table" | "bar" | "series";
}

type CardType = "ensemble-chart" | "figure-gallery" | "series-chart";

// interface CardTemplate extends ExplorerCardType {
//   // Extended properties for series charts
//   seriesConfig?: {
//     groupBy?: string;
//     hue?: string;
//     style?: string;
//   };
// }

export function CardTemplateGenerator({
  providerSlug,
  diagnosticSlug,
  currentFilters = {},
  seriesParams,
  availableDimensions = [],
  availableData = [],
  currentTab,
  currentViewType,
}: CardTemplateGeneratorProps) {
  const { toast } = useToast();
  const [isVisible, setIsVisible] = useState(true); // Start visible for testing

  // Form state - set default based on current tab and view context
  const getDefaultCardType = (): CardType => {
    if (currentTab === "figures") return "figure-gallery";
    if (currentTab === "values") {
      if (currentViewType === "series") return "series-chart";
      if (currentViewType === "bar") return "ensemble-chart";
      return "ensemble-chart"; // Default for table view
    }
    return "ensemble-chart"; // Default fallback
  };

  const [cardType, setCardType] = useState<CardType>(getDefaultCardType());
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [metricUnits, setMetricUnits] = useState("");
  const [xAxis, setXAxis] = useState("metric");
  const [clipMin, setClipMin] = useState<number | undefined>();
  const [clipMax, setClipMax] = useState<number | undefined>();
  const [span, setSpan] = useState<1 | 2>(1);
  const [includeFilters, setIncludeFilters] = useState<string[]>([]);

  // Series-specific state
  const [seriesGroupBy, setSeriesGroupBy] = useState(
    seriesParams?.groupBy || ""
  );
  const [seriesHue, setSeriesHue] = useState(seriesParams?.hue || "");
  const [seriesStyle, setSeriesStyle] = useState(seriesParams?.style || "");

  // Generate the card template
  const generateTemplate = useCallback((): ExplorerCardType => {
    const selectedFilters = Object.fromEntries(
      includeFilters
        .map((key) => [key, currentFilters[key]])
        .filter(([, value]) => value)
    );

    const baseContent = {
      provider: providerSlug,
      diagnostic: diagnosticSlug,
      title,
      span,
    };

    let content: ExplorerCardContent;

    switch (cardType) {
      case "ensemble-chart":
        content = {
          type: "ensemble-chart",
          ...baseContent,
          metricUnits: metricUnits || "unitless",
          xAxis,
          ...(clipMin !== undefined && { clipMin }),
          ...(clipMax !== undefined && { clipMax }),
          ...(Object.keys(selectedFilters).length > 0 && {
            otherFilters: selectedFilters,
          }),
        };
        break;

      case "figure-gallery":
        content = {
          type: "figure-gallery",
          ...baseContent,
          ...(description && { description }),
        };
        break;

      case "series-chart":
        content = {
          type: "series-chart",
          ...baseContent,
          ...(description && { description }),
          metricUnits: metricUnits || "unitless",
          ...(Object.keys(selectedFilters).length > 0 && {
            otherFilters: selectedFilters,
          }),
          seriesConfig: {
            ...(seriesGroupBy &&
              seriesGroupBy !== "none" && { groupBy: seriesGroupBy }),
            ...(seriesHue && seriesHue !== "none" && { hue: seriesHue }),
            ...(seriesStyle &&
              seriesStyle !== "none" && { style: seriesStyle }),
          },
        };
        break;
    }

    return {
      title,
      description,
      content: [content],
    };
  }, [
    cardType,
    title,
    description,
    metricUnits,
    xAxis,
    clipMin,
    clipMax,
    span,
    includeFilters,
    currentFilters,
    providerSlug,
    diagnosticSlug,
    seriesGroupBy,
    seriesHue,
    seriesStyle,
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
                  <SelectItem value="ensemble-chart">Ensemble Chart</SelectItem>
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
            {(cardType === "ensemble-chart" || cardType === "series-chart") && (
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

                <div className="space-y-2">
                  <Label htmlFor="xAxis">X-Axis</Label>
                  <Input
                    id="xAxis"
                    value={xAxis}
                    onChange={(e) => setXAxis(e.target.value)}
                    placeholder="metric"
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
                          e.target.value ? Number(e.target.value) : undefined
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
                          e.target.value ? Number(e.target.value) : undefined
                        )
                      }
                      placeholder="Optional"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Series-specific options */}
            {cardType === "series-chart" && availableDimensions.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <Label className="text-sm font-medium">
                    Series Configuration
                  </Label>

                  <div className="space-y-2">
                    <Label htmlFor="seriesGroupBy" className="text-xs">
                      Group By
                    </Label>
                    <Select
                      value={seriesGroupBy}
                      onValueChange={setSeriesGroupBy}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select dimension" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {availableDimensions.map((dim) => (
                          <SelectItem key={dim} value={dim}>
                            {dim}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="seriesHue" className="text-xs">
                      Color By
                    </Label>
                    <Select value={seriesHue} onValueChange={setSeriesHue}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select dimension" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {availableDimensions.map((dim) => (
                          <SelectItem key={dim} value={dim}>
                            {dim}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="seriesStyle" className="text-xs">
                      Style By
                    </Label>
                    <Select value={seriesStyle} onValueChange={setSeriesStyle}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select dimension" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {availableDimensions.map((dim) => (
                          <SelectItem key={dim} value={dim}>
                            {dim}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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
                                prev.filter((k) => k !== key)
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
                  <ExplorerCardPreview
                    card={generateTemplate()}
                    availableData={availableData}
                  />
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
