import { useSuspenseQuery } from "@tanstack/react-query";
import { executionsGetOptions } from "@/client/@tanstack/react-query.gen";

/**
 * The latest execution of a group, or `undefined` for a group that has never run
 *
 * It comes from the group, whose executions are oldest first,
 * rather than from the group's execution endpoint, which fails for a group without one.
 */
export function useLatestExecution(groupId: string) {
  const { data } = useSuspenseQuery(
    executionsGetOptions({ path: { group_id: groupId } }),
  );
  return data.executions.at(-1);
}
