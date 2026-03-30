import { describe, expect, it } from "vitest";
import { containsLatex, renderLatexToHtml } from "./latex";

describe("containsLatex", () => {
  it("returns true for strings with $...$ delimiters", () => {
    expect(containsLatex("Temperature at 2.0 $^\\circ$ C")).toBe(true);
  });

  it("returns true for multiple LaTeX expressions", () => {
    expect(containsLatex("$x^2$ and $y^2$")).toBe(true);
  });

  it("returns false for strings without LaTeX", () => {
    expect(containsLatex("Temperature at 2.0 degrees C")).toBe(false);
  });

  it("returns false for empty dollar signs", () => {
    expect(containsLatex("price is $$ today")).toBe(false);
  });

  it("returns false for single dollar signs without pairs", () => {
    expect(containsLatex("costs $5")).toBe(false);
  });
});

describe("renderLatexToHtml", () => {
  it("renders degree symbol from LaTeX notation", () => {
    const result = renderLatexToHtml(
      "Multimodel standard deviation of Temperature at 2.0 $^\\circ$ C",
    );
    // KaTeX should render the LaTeX part as HTML containing the degree symbol
    expect(result).toContain("katex");
    expect(result).not.toContain("$^\\circ$");
  });

  it("passes through strings without LaTeX unchanged (HTML-escaped)", () => {
    const result = renderLatexToHtml("Simple text without LaTeX");
    expect(result).toBe("Simple text without LaTeX");
  });

  it("handles multiple LaTeX expressions in one string", () => {
    const result = renderLatexToHtml("$x^2$ plus $y^2$");
    expect(result).toContain("katex");
    expect(result).not.toContain("$x^2$");
    expect(result).not.toContain("$y^2$");
    // The plain text " plus " should still be present
    expect(result).toContain(" plus ");
  });

  it("escapes HTML in non-LaTeX segments", () => {
    const result = renderLatexToHtml("a < b & c > d $x^2$");
    expect(result).toContain("&lt;");
    expect(result).toContain("&amp;");
    expect(result).toContain("&gt;");
  });

  it("handles malformed LaTeX without throwing", () => {
    // KaTeX with throwOnError: false should not throw
    const result = renderLatexToHtml("$\\invalidcommand$");
    expect(typeof result).toBe("string");
  });

  it("renders superscripts", () => {
    const result = renderLatexToHtml("CO$_2$ emissions");
    expect(result).toContain("katex");
    expect(result).not.toContain("$_2$");
  });
});
