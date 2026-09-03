export const SOURCE_TYPES = ["cmip6", "cmip7", "obs4mips"] as const;

export type SourceType = (typeof SOURCE_TYPES)[number];

/** The CMIP eras, which are the only sources carrying experiment, source and variable facets. */
export function isCmipSourceType(sourceType: string): boolean {
  return sourceType.startsWith("cmip");
}

export function getSourceTypeColour(sourceType: string | SourceType) {
  switch (sourceType) {
    case "cmip6":
      return "bg-cmip-mustard/30 text-foreground";
    case "cmip7":
      return "bg-cmip-blue text-white dark:ring-1 dark:ring-white/40";
    case "obs4mips":
      return "bg-cmip-cyan/30 text-foreground";
    default:
      return "bg-gray-500";
  }
}
