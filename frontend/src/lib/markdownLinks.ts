/** A piece of text, which is a link when it has an `href`; `start` is where it begins in the original */
export interface TextPart {
  text: string;
  href?: string;
  start: number;
}

/** A Markdown link to a web address, e.g. `[Lee et al. 2019](https://doi.org/10.1007/s00382-018-4355-4)` */
const MARKDOWN_LINK = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;

/**
 * Split text at the Markdown links it contains
 *
 * Only links to web addresses become links; anything else, such as a relative or `javascript:` target, stays text.
 */
export function splitMarkdownLinks(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let end = 0;
  for (const match of text.matchAll(MARKDOWN_LINK)) {
    if (match.index > end) {
      parts.push({ text: text.slice(end, match.index), start: end });
    }
    parts.push({ text: match[1], href: match[2], start: match.index });
    end = match.index + match[0].length;
  }
  if (end < text.length) {
    parts.push({ text: text.slice(end), start: end });
  }
  return parts;
}
