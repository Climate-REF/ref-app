import katex from "katex";
import "katex/dist/katex.min.css";

const LATEX_DELIMITER = /(\$[^$]+\$)/g;
const LATEX_TEST = /\$[^$]+\$/;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Render inline LaTeX math expressions (`$...$`) within a plain text string
 * to HTML. Non-math text is left as-is (HTML-escaped).
 *
 * KaTeX is loaded in a separate chunk (see vite.config.ts) so it doesn't
 * bloat the main bundle.
 */
export function renderLatexToHtml(text: string): string {
  const parts = text.split(LATEX_DELIMITER);

  return parts
    .map((part) => {
      if (part.startsWith("$") && part.endsWith("$")) {
        const latex = part.slice(1, -1);
        return katex.renderToString(latex, {
          throwOnError: false,
          output: "html",
        });
      }
      return escapeHtml(part);
    })
    .join("");
}

/**
 * Check whether a string contains any LaTeX math delimiters.
 */
export function containsLatex(text: string): boolean {
  return LATEX_TEST.test(text);
}
