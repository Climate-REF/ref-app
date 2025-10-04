import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { executionsExecutionArchive, executionsMetricBundle } from "@/client";
import { Button } from "@/components/ui/button.tsx";
import { downloadBlob } from "@/lib/downloadUtils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

interface DownloadOutputsProps {
  executionGroup: string;
  executionId?: string;
}

export function DownloadOutputs({
  executionGroup,
  executionId,
}: DownloadOutputsProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleDownload = async (type: "bundle" | "archive") => {
    try {
      setIsLoading(true);
      const query =
        type === "bundle" ? executionsMetricBundle : executionsExecutionArchive;

      const { data, error } = await query({
        path: { group_id: executionGroup },
        query: { execution_id: executionId },
        parseAs: "blob",
      });

      if (error) {
        console.error(`Error downloading ${type}:`, error);
        throw new Error(`Failed to download ${type}`);
      }

      // Get filename from Content-Disposition header
      const filename = `execution-${executionGroup}-${executionId}-${type}.${type === "bundle" ? "json" : "tar.gz"}`;

      // @ts-expect-error Can't type correctly
      downloadBlob(data, filename);
    } catch (error) {
      console.error(`Error downloading ${type}:`, error);
      alert(`Failed to download ${type}. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button disabled={isLoading}>
          {isLoading ? "Downloading..." : "Download Outputs"} <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="dropdown-content-width-full">
        <DropdownMenuItem onClick={() => handleDownload("bundle")}>
          Metric Bundle
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDownload("archive")}>
          All files (tar.gz)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
