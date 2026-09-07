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

const BY_KEY = new Map<string, Outcome>(
  OUTCOMES.map((outcome) => [outcome.key, outcome]),
);

/** Describe an outcome the API sent, falling back to the raw value for one we do not know. */
export function outcomeFor(
  key: string,
): Outcome | { label: string; badge: "secondary" } {
  return BY_KEY.get(key) ?? { label: key, badge: "secondary" };
}
