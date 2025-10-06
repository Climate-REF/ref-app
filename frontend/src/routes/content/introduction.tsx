import { createFileRoute } from "@tanstack/react-router";
import About from "@/content/introduction-ref-v1.mdx";

export const Route = createFileRoute("/content/introduction")({
  component: About,
  staticData: {
    title: "Introduction",
  },
});
