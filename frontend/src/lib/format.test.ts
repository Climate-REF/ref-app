import { describe, expect, it } from "vitest";
import { formatBytes, formatCoreHours, formatDuration } from "./format";

describe("formatDuration", () => {
  it("returns a dash for missing values", () => {
    expect(formatDuration(null)).toBe("—");
    expect(formatDuration(undefined)).toBe("—");
  });

  it("keeps a decimal for short durations", () => {
    expect(formatDuration(1.234)).toBe("1.2s");
    expect(formatDuration(45.6)).toBe("46s");
  });

  it("uses minutes and seconds under an hour", () => {
    expect(formatDuration(200)).toBe("3m 20s");
  });

  it("rounds before splitting into units", () => {
    expect(formatDuration(59.6)).toBe("1m 0s");
    expect(formatDuration(3599.6)).toBe("1h 0m");
  });

  it("uses hours and minutes under a day", () => {
    expect(formatDuration(7500)).toBe("2h 5m");
  });

  it("uses days and hours beyond a day", () => {
    expect(formatDuration(97200)).toBe("1d 3h");
  });
});

describe("formatBytes", () => {
  it("returns a dash for missing values", () => {
    expect(formatBytes(null)).toBe("—");
  });

  it("keeps bytes whole", () => {
    expect(formatBytes(512)).toBe("512 B");
  });

  it("scales to binary units", () => {
    expect(formatBytes(1536)).toBe("1.5 KiB");
    expect(formatBytes(6781140992)).toBe("6.3 GiB");
  });

  it("never prints 1024.0 of a unit", () => {
    expect(formatBytes(1048570)).toBe("1.0 MiB");
  });
});

describe("formatCoreHours", () => {
  it("returns a dash for missing values", () => {
    expect(formatCoreHours(null)).toBe("—");
    expect(formatCoreHours(undefined)).toBe("—");
  });

  it("keeps two decimals below an hour", () => {
    expect(formatCoreHours(180)).toBe("0.05");
  });

  it("keeps one decimal up to ten hours", () => {
    expect(formatCoreHours(9000)).toBe("2.5");
  });

  it("rounds to whole core hours above ten", () => {
    expect(formatCoreHours(360000)).toBe("100");
  });
});
