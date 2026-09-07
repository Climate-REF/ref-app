import type { RunCounts } from "@/client";

/** How an execution group's latest execution turned out, in the order the run bar stacks them. */
export const OUTCOMES = [
  {
    key: "successful",
    label: "Successful",
    colour: "bg-emerald-500",
    badge: "outline",
  },
  {
    key: "failed",
    label: "Failed",
    colour: "bg-destructive",
    badge: "destructive",
  },
  {
    key: "running",
    label: "Running",
    colour: "bg-blue-500",
    badge: "secondary",
  },
] as const satisfies readonly {
  key: keyof RunCounts;
  label: string;
  colour: string;
  badge: "outline" | "destructive" | "secondary";
}[];

export type Outcome = (typeof OUTCOMES)[number];

/** How one outcome reads on a badge. */
export interface OutcomeDisplay {
  label: string;
  badge: Outcome["badge"];
}

/** Name and style an outcome the API sent, falling back to the raw value for an unknown one. */
export function outcomeFor(key: string): OutcomeDisplay {
  return (
    OUTCOMES.find((outcome) => outcome.key === key) ?? {
      label: key,
      badge: "secondary",
    }
  );
}
