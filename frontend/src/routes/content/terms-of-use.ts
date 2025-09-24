import { createFileRoute } from "@tanstack/react-router";
import TermsOfUse from "./terms-of-use.mdx";

export const Route = createFileRoute("/content/terms-of-use")({
  component: TermsOfUse,
  staticData: {
    title: "Terms of Use",
  },
});
