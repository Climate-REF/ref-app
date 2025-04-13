import { createFileRoute } from "@tanstack/react-router";
import About from "./about.mdx";

export const Route = createFileRoute("/content/about")({
  component: About,
  staticData: {
    title: "About",
    breadcrumbs: [
      {
        name: "Home",
        url: "/",
      },
    ],
  },
});
