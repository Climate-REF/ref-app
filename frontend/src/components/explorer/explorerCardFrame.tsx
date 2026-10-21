import type { ReactNode } from "react";
import type { ReferenceDatasetLink } from "@/client/types.gen";
import { TextWithLinks } from "@/components/app/textWithLinks";
import { cn } from "@/lib/utils";
import { Badge } from "../ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { ExplorerTooltip } from "./explorerTooltip";
import type { ExplorerCardContent as ExplorerCardContentType } from "./types";

interface ExplorerCardFrameProps {
  contentItem: ExplorerCardContentType;
  /** The menu next to the info tooltip, if the card has one */
  menu?: ReactNode;
  children: ReactNode;
}

/** The card around a content item, with its title and description, menu and footer. */
export function ExplorerCardFrame({
  contentItem,
  menu,
  children,
}: ExplorerCardFrameProps) {
  const spanClass = contentItem.span === 2 ? "lg:col-span-2" : "lg:col-span-1";

  return (
    <div className={cn("relative group", spanClass)}>
      <Card className="h-full flex flex-col">
        <CardHeader className="flex items-start justify-between">
          <div className="flex flex-col gap-2">
            <CardTitle>{contentItem.title}</CardTitle>
            <div className="min-h-8">
              {contentItem.description && (
                <CardDescription>
                  <TextWithLinks text={contentItem.description} />
                </CardDescription>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <ExplorerTooltip contentItem={contentItem} showOnHover={true} />
            {menu}
          </div>
        </CardHeader>
        <CardContent className="flex-auto flex flex-col justify-end">
          {children}
        </CardContent>
        <CardFooter className="min-h-8 flex-none flex-col items-start gap-2">
          {contentItem.interpretation && (
            <div className="text-sm text-muted-foreground">
              <span className="text-sm text-muted-foreground font-semibold">
                Interpretation:
              </span>{" "}
              {contentItem.interpretation}
            </div>
          )}
          {contentItem.referenceDatasets &&
            contentItem.referenceDatasets.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-muted-foreground">
                  Reference datasets:
                </span>
                {contentItem.referenceDatasets.map(
                  (ref: ReferenceDatasetLink) => (
                    <Tooltip key={ref.slug}>
                      <TooltipTrigger asChild>
                        <Badge
                          variant={
                            ref.type === "primary" ? "outline" : "secondary"
                          }
                          className="text-xs cursor-help"
                        >
                          {ref.slug.slice(ref.slug.indexOf(".") + 1)}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <div className="text-sm space-y-1">
                          <div className="font-semibold">{ref.slug}</div>
                          {ref.description && (
                            <div className="text-muted-foreground">
                              {ref.description}
                            </div>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ),
                )}
              </div>
            )}
        </CardFooter>
      </Card>
    </div>
  );
}
