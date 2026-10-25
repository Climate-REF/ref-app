import { Link } from "@tanstack/react-router";
import { SquareArrowOutUpRight } from "lucide-react";

/** Opens an execution group's logs */
export function OpenGroupLink({ groupId }: { groupId: number }) {
  return (
    <Link
      to="/executions/$groupId/logs"
      params={{ groupId: groupId.toString() }}
      aria-label="Open execution group"
      title="Open execution group"
      className="shrink-0"
    >
      <SquareArrowOutUpRight className="size-4 text-blue-500 hover:text-blue-300 dark:text-blue-400 dark:hover:text-blue-300" />
    </Link>
  );
}
