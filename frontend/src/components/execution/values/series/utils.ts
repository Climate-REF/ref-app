// Get hash-based index from dimension value
export function getDimensionHashIndex(
  seriesKey: string,
  dimension: string,
  arrayLength: number,
): number {
  if (dimension && dimension !== "none") {
    const dimensionValue = seriesKey
      .split(" | ")
      .find((part) => part.startsWith(`${dimension}:`));
    if (dimensionValue) {
      const hash = dimensionValue
        .split(":")[1]
        .split("")
        .reduce((acc, char) => {
          const newAcc = (acc << 5) - acc + char.charCodeAt(0);
          return newAcc & newAcc;
        }, 0);
      return Math.abs(hash) % arrayLength;
    }
  }

  // Fallback to the first item
  return 0;
}
