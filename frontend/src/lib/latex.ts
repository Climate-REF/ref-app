import katex from "katex";
import "katex/dist/katex.min.css";

/**
 * Render inline LaTeX math expressions (`$...$`) within a plain text string
 * to HTML. Non-math text is left as-is (HTML-escaped).
 *
 * KaTeX is loaded in a separate chunk (see vite.config.ts) so it doesn't
 * bloat the main bundle.
 */
export function renderLatexToHtml(text: string): string {
  // Split on $...$ math delimiters, preserving the groups
  const parts = text.split(/(\$[^$]+\$)/g);

  return parts
    .map((part) => {
      if (part.startsWith("$") && part.endsWith("$")) {
        const latex = part.slice(1, -1);
        try {
          return katex.renderToString(latex, {
            throwOnError: false,
            output: "html",
          });
        } catch {
          return part;
        }
      }
      // Escape HTML in plain text segments
      return part
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    })
    .join("");
}

/**
 * Check whether a string contains any LaTeX math delimiters.
 */
export function containsLatex(text: string): boolean {
  return /\$[^$]+\$/.test(text);
}
