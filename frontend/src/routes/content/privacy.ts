import { createFileRoute } from "@tanstack/react-router";
import Privacy from "@/content/privacy.mdx";

export const Route = createFileRoute("/content/privacy")({
  component: Privacy,
  staticData: {
    title: "Privacy Policy",
  },
});
