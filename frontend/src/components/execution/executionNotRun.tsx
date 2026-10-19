/** Stands in for what an execution would show, for a group that has never run. */
export function ExecutionNotRun({ what }: { what: string }) {
  return (
    <p className="py-6 text-center text-sm text-muted-foreground">
      This execution group has not run yet, so there are no {what} to show.
    </p>
  );
}
