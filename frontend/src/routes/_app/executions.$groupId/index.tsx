import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/executions/$groupId/")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/executions/$groupId/files",
      params: { groupId: params.groupId },
    });
  },
});
