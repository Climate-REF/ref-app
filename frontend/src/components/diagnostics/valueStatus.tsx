interface ValueStatusProps {
  available: boolean | null;
  failed?: boolean;
  availableTitle?: string;
  noneTitle?: string;
}

/**
 * Whether a diagnostic has a kind of metric value, which is null until the value flags load.
 */
export function ValueStatus({
  available,
  failed = false,
  availableTitle,
  noneTitle,
}: ValueStatusProps) {
  if (available === null) {
    return (
      <span className="text-muted-foreground">
        {failed ? "Unknown" : "Checking..."}
      </span>
    );
  }
  return available ? (
    <span
      className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400"
      title={availableTitle}
    >
      ● Available
    </span>
  ) : (
    <span
      className="inline-flex items-center gap-1 text-muted-foreground"
      title={noneTitle}
    >
      ○ None
    </span>
  );
}
