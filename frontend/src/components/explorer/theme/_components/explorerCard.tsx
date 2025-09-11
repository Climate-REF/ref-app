import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CopyButton } from "@/components/ui/copyButton";
import { Info } from "lucide-react";
import type { ExplorerCard as ExplorerCardType } from "../../types";
import { ExplorerCardContent } from "./explorerCardContent";

interface ExplorerCardProps {
  card: ExplorerCardType;
}

export function ExplorerCard({ card }: ExplorerCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle>{card.title}</CardTitle>
            {card.description ? (
              <CardDescription>{card.description}</CardDescription>
            ) : null}
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                <Info className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-md">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Card Configuration</p>
                  <CopyButton
                    text={JSON.stringify(
                      {
                        title: card.title,
                        description: card.description,
                        content: card.content,
                      },
                      null,
                      2
                    )}
                    label="Copy"
                  />
                </div>
                <pre className="text-xs bg-gray-800 text-green-400 p-2 rounded overflow-x-auto">
                  {JSON.stringify(
                    {
                      title: card.title,
                      description: card.description,
                      content: card.content,
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {card.content.map((contentItem) => (
            <ExplorerCardContent
              key={`${card.title}:${contentItem.diagnostic}`}
              contentItem={contentItem}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
