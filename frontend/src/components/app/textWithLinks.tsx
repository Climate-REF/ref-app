import { LinkExternal } from "@/components/ui/link";
import { splitMarkdownLinks } from "@/lib/markdownLinks";

/** Text from the API, with the Markdown links it contains shown as links */
export function TextWithLinks({ text }: { text: string }) {
  return splitMarkdownLinks(text).map((part) =>
    part.href ? (
      <LinkExternal key={part.start} href={part.href}>
        {part.text}
      </LinkExternal>
    ) : (
      <span key={part.start}>{part.text}</span>
    ),
  );
}
