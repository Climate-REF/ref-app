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

export function createScaledTickFormatter(
  values: number[],
): (value: number | string) => string {
  if (values.length === 0) return (value: string | number) => String(value);

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  // Determine appropriate formatting based on range and magnitude
  return (value: string | number): string => {
    const numValue = Number(value);

    // Handle very large numbers (scientific notation)
    if (Math.abs(numValue) >= 1e6 || (range > 0 && Math.abs(numValue) >= 1e4)) {
      return numValue.toExponential(1);
    }

    // Handle very small numbers (scientific notation)
    if (Math.abs(numValue) < 1e-3 && numValue !== 0) {
      return numValue.toExponential(1);
    }

    // Handle decimal precision based on range
    if (range < 0.1) {
      return numValue.toFixed(3);
    }
    if (range < 1) {
      return numValue.toFixed(2);
    }
    if (range < 10) {
      return numValue.toFixed(2);
    }
    if (range < 100) {
      return numValue.toFixed(1);
    }
    return numValue.toFixed(0);
  };
}
