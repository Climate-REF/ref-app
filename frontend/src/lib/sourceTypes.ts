export const SOURCE_TYPES = ["cmip6", "cmip7", "obs4mips"] as const;

export type SourceType = (typeof SOURCE_TYPES)[number];

export function getSourceTypeColour(sourceType: string | SourceType) {
  switch (sourceType) {
    case "cmip6":
      return "bg-sky-200 text-foreground";
    case "cmip7":
      return "bg-violet-200 text-foreground";
    case "obs4mips":
      return "bg-amber-200 text-foreground";
    default:
      return "bg-gray-500";
  }
}
