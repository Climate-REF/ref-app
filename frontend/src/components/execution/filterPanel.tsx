import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";

interface FilterPanelProps {
  filters: Record<string, any>;
  onFilterChange: (filters: Record<string, any>) => void;
  onClear: () => void;
}

export function FilterPanel({
  filters,
  onFilterChange,
  onClear,
}: FilterPanelProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <Input
          placeholder="Filter by Provider Name..."
          defaultValue={filters.provider_name_contains || ""}
          onChange={(e) => {
            const value = e.target.value;
            const handler = setTimeout(() => {
              onFilterChange({ provider_name_contains: value });
            }, 200);
            return () => clearTimeout(handler);
          }}
          className="max-w-sm"
        />
        <Input
          placeholder="Filter by Diagnostic Name..."
          defaultValue={filters.diagnostic_name_contains || ""}
          onChange={(e) => {
            const value = e.target.value;
            const handler = setTimeout(() => {
              onFilterChange({ diagnostic_name_contains: value });
            }, 200);
            return () => clearTimeout(handler);
          }}
          className="max-w-sm"
        />

        <Select
          onValueChange={(e) => {
            onFilterChange({ dirty: e === "all" ? undefined : e });
          }}
          value={filters.dirty ?? "all"}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Dirty Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Dirty Statuses</SelectItem>
            <SelectItem value="true">Dirty</SelectItem>
            <SelectItem value="false">Not Dirty</SelectItem>
          </SelectContent>
        </Select>
        <Select
          onValueChange={(e) => {
            onFilterChange({ successful: e === "all" ? undefined : e });
          }}
          value={filters.successful ?? "all"}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Success Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Success Statuses</SelectItem>
            <SelectItem value="true">Successful</SelectItem>
            <SelectItem value="false">Failed</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={onClear} variant="outline">
          Clear All
        </Button>
      </div>
    </div>
  );
}
