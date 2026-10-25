import { useInfiniteQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ChevronRight } from "lucide-react";
import type { DiagnosticCatalogEntry, ExecutionGroup } from "@/client";
import { executionsListRecentExecutionGroupsInfiniteOptions } from "@/client/@tanstack/react-query.gen";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { apiErrorMessage } from "@/lib/apiError";
import { groupFacets } from "@/lib/failures";
import type { MipEra } from "@/lib/mipEras";
import { nextOffset } from "@/lib/pagination";
import { OpenGroupLink } from "./openGroupLink";

/** Passing groups fetched at a time, because a diagnostic can have thousands */
const PAGE_SIZE = 25;

function PassingGroupItem({ group }: { group: ExecutionGroup }) {
  const execution = group.executions.at(-1);
  const { model, experiment, member } = groupFacets(group);
  return (
    <li className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm">
      <span className="min-w-0 flex-1">
        <span className="block truncate font-mono" title={group.key}>
          {group.key}
        </span>
        <span className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
          {model && <span title="Model">{model}</span>}
          {experiment && <span title="Experiment">{experiment}</span>}
          {member && <span title="Ensemble member">{member}</span>}
        </span>
      </span>
      {execution && (
        <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
          {format(new Date(execution.updated_at), "yyyy-MM-dd HH:mm")}
        </span>
      )}
      <OpenGroupLink groupId={group.id} />
    </li>
  );
}

function PassingGroupList({
  diagnostic,
  mipEra,
  model,
}: {
  diagnostic: DiagnosticCatalogEntry;
  mipEra: MipEra;
  model?: string;
}) {
  const {
    data,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    ...executionsListRecentExecutionGroupsInfiniteOptions({
      query: {
        successful: true,
        provider_slug: diagnostic.provider.slug,
        diagnostic_slug: diagnostic.slug,
        mip_era: mipEra,
        source_id: model,
        limit: PAGE_SIZE,
      },
    }),
    initialPageParam: 0,
    getNextPageParam: (_lastPage, allPages) => nextOffset(allPages),
  });

  if (!data && error) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-destructive">{apiErrorMessage(error)}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }
  if (!data) {
    return (
      <div aria-busy="true" className="space-y-1">
        <span className="sr-only">Loading passing execution groups</span>
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  const groups = data.pages.flatMap((page) => page.data);
  return (
    <div className="space-y-2">
      <ul className="space-y-1">
        {groups.map((group) => (
          <PassingGroupItem key={group.id} group={group} />
        ))}
      </ul>
      {error && (
        <p className="text-sm text-destructive">{apiErrorMessage(error)}</p>
      )}
      {hasNextPage && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? "Loading more..." : "Load More"}
        </Button>
      )}
    </div>
  );
}

/** A diagnostic's passing execution groups, fetched only once expanded */
export function PassingGroups({
  diagnostic,
  count,
  mipEra,
  model,
}: {
  diagnostic: DiagnosticCatalogEntry;
  count: number;
  mipEra: MipEra;
  model?: string;
}) {
  return (
    <Collapsible className="space-y-2">
      <CollapsibleTrigger className="group flex items-center gap-1 rounded-sm text-sm font-medium hover:underline">
        <ChevronRight className="size-4 transition-transform group-data-[state=open]:rotate-90" />
        {count} passing execution {count === 1 ? "group" : "groups"}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <PassingGroupList
          diagnostic={diagnostic}
          mipEra={mipEra}
          model={model}
        />
      </CollapsibleContent>
    </Collapsible>
  );
}
