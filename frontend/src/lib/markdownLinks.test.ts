import { describe, expect, it } from "vitest";
import { splitMarkdownLinks } from "./markdownLinks";

describe("splitMarkdownLinks", () => {
  it("turns Markdown links into links between the surrounding text", () => {
    expect(
      splitMarkdownLinks(
        "Pattern RMSE, see [Lee et al. 2019](https://doi.org/10.1007/s00382-018-4355-4).",
      ),
    ).toEqual([
      { text: "Pattern RMSE, see ", start: 0 },
      {
        text: "Lee et al. 2019",
        href: "https://doi.org/10.1007/s00382-018-4355-4",
        start: 18,
      },
      { text: ".", start: 78 },
    ]);
  });

  it("keeps several links and links at either end", () => {
    const parts = splitMarkdownLinks(
      "[A](https://a.org) and [B](http://b.org)",
    );
    expect(parts.map(({ text, href }) => ({ text, href }))).toEqual([
      { text: "A", href: "https://a.org" },
      { text: " and ", href: undefined },
      { text: "B", href: "http://b.org" },
    ]);
  });

  it("leaves text without links as one piece", () => {
    expect(splitMarkdownLinks("No links here")).toEqual([
      { text: "No links here", start: 0 },
    ]);
    expect(splitMarkdownLinks("")).toEqual([]);
  });

  it("keeps links to anything but a web address as text", () => {
    expect(splitMarkdownLinks("[x](javascript:alert(1)) [y](/local)")).toEqual([
      { text: "[x](javascript:alert(1)) [y](/local)", start: 0 },
    ]);
  });
});
