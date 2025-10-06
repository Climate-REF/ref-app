import { createFileRoute } from "@tanstack/react-router";
import TermsOfUse from "@/content/terms-of-use.mdx";

export const Route = createFileRoute("/content/terms-of-use")({
  component: TermsOfUse,
  staticData: {
    title: "Terms of Use",
  },
});
