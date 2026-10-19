import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLatestExecution } from "@/hooks/useLatestExecution";

/** Stands in for what an execution would show, for a group that has never run. */
export function ExecutionNotRun({ what }: { what: string }) {
  return (
    <p className="py-6 text-center text-sm text-muted-foreground">
      This execution group has not run yet, so there are no {what} to show.
    </p>
  );
}

/** A tab of the execution group page whose content needs an execution, which says so for a group that has never run. */
export function ExecutionTabCard({
  groupId,
  title,
  description,
  what,
  children,
}: {
  groupId: string;
  title: string;
  description: ReactNode;
  /** What the tab shows, for the message when there is none */
  what: string;
  children: ReactNode;
}) {
  const hasRun = useLatestExecution(groupId) !== undefined;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {hasRun ? children : <ExecutionNotRun what={what} />}
      </CardContent>
    </Card>
  );
}
