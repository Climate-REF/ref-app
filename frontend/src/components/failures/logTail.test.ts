import { describe, expect, it } from "vitest";
import { logTailLines } from "./logTail";

const log = (count: number) =>
  Array.from({ length: count }, (_, i) => `line ${i}\n`).join("");

describe("logTailLines", () => {
  it("shows every line of a log no longer than the limit", () => {
    expect(logTailLines(log(20), 20)).toEqual({
      lines: Array.from({ length: 20 }, (_, i) => `line ${i}`),
      truncated: false,
    });
  });

  it("drops the oldest line when one more than the limit arrived", () => {
    const { lines, truncated } = logTailLines(log(21), 20);
    expect(truncated).toBe(true);
    expect(lines).toHaveLength(20);
    expect(lines[0]).toBe("line 1");
    expect(lines.at(-1)).toBe("line 20");
  });

  it("keeps a last line without a line ending", () => {
    expect(logTailLines("a\nb", 20)).toEqual({
      lines: ["a", "b"],
      truncated: false,
    });
  });

  it("finds no lines in an empty log", () => {
    expect(logTailLines("", 20)).toEqual({ lines: [], truncated: false });
  });
});
