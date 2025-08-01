import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils.ts";

interface DetailItem {
  label: string;
  value: React.ReactNode;
  className?: string;
}

interface DetailsPanelProps {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  items: DetailItem[];
}

function SummaryItem({
  className,
  label,
  children,
}: React.ComponentProps<"div"> & { label: string }) {
  return (
    <div className={cn("space-y-1", className)}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-medium overflow-hidden text-nowrap text-ellipsis">
        {children}
      </p>
    </div>
  );
}

export function DetailsPanel({
  title,
  description,
  action,
  items,
}: DetailsPanelProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {action}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
          {items.map(({ label, value, className }) => (
            <SummaryItem key={label} label={label} className={className}>
              <span>{value}</span>
            </SummaryItem>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
