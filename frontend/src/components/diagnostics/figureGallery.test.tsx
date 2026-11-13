import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { Execution, ExecutionGroup, ExecutionOutput } from "@/client";
import { diagnosticsListExecutionGroupsOptions } from "@/client/@tanstack/react-query.gen.ts";
import { FigureGallery } from "./figureGallery";

beforeAll(() => {
  // cmdk measures and scrolls its items, which jsdom does not implement
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Element.prototype.scrollIntoView ??= () => {};
});

const figure = (id: number, filename: string) =>
  ({
    id,
    filename,
    description: filename,
    long_name: filename,
    url: `/${filename}`,
    output_type: "plot",
  }) as ExecutionOutput;

const groupOf = (figures: ExecutionOutput[]) =>
  ({
    id: 1,
    key: "group",
    selectors: {},
    executions: [{ outputs: figures } as Execution],
  }) as ExecutionGroup;

const groupWithSelectors = (
  id: number,
  filename: string,
  selectors: ExecutionGroup["selectors"],
) =>
  ({
    id,
    key: filename,
    selectors,
    executions: [{ outputs: [figure(id, filename)] } as Execution],
  }) as ExecutionGroup;

function renderGroups(
  groups: ExecutionGroup[],
  props: Partial<ComponentProps<typeof FigureGallery>> = {},
) {
  const queryClient = new QueryClient();
  const path = { provider_slug: "pmp", diagnostic_slug: "enso" };
  queryClient.setQueryData(
    diagnosticsListExecutionGroupsOptions({ path, query: {} }).queryKey,
    { count: groups.length, data: groups },
  );
  const tree = (
    galleryProps: Partial<ComponentProps<typeof FigureGallery>>,
  ) => (
    <QueryClientProvider client={queryClient}>
      <FigureGallery
        providerSlug="pmp"
        diagnosticSlug="enso"
        {...galleryProps}
      />
    </QueryClientProvider>
  );
  const result = render(tree(props));
  return {
    ...result,
    /** Render again with other props, keeping the gallery mounted. */
    rerenderWith: (nextProps: Partial<ComponentProps<typeof FigureGallery>>) =>
      result.rerender(tree(nextProps)),
  };
}

function renderGallery(filenames: string[], pageSize?: number) {
  return renderGroups(
    [groupOf(filenames.map((name, i) => figure(i + 1, name)))],
    { pageSize },
  );
}

const filterInput = () => screen.getByLabelText("Filter by Figure Name");

/** Type into the text filter and wait until the debounced change is reported. */
async function typeFilter(value: string) {
  fireEvent.change(filterInput(), { target: { value } });
  await act(() => new Promise((resolve) => setTimeout(resolve, 350)));
}

describe("FigureGallery", () => {
  it("goes back to the first page when the filter changes", async () => {
    renderGallery(["a1.png", "a2.png", "a3.png", "b.png"], 2);
    fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();

    await typeFilter("^a");
    expect(screen.getByText(/Showing 1–2 of 3/)).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
  });

  it("opens the clicked figure and steps through the filtered figures", () => {
    renderGallery(["a.png", "b.png", "c.png"], 2);
    fireEvent.click(screen.getAllByRole("img", { name: "b.png" })[0]);
    expect(screen.getByRole("dialog")).toHaveTextContent("2 of 3");

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByRole("dialog")).toHaveTextContent("3 of 3");
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByRole("dialog")).toHaveTextContent("1 of 3");
  });

  it("scrolls through every figure without a page size", () => {
    renderGallery(["a.png", "b.png", "c.png", "d.png"]);
    expect(screen.queryByText(/Page/)).not.toBeInTheDocument();
    expect(
      screen.getAllByRole("img").map((img) => img.getAttribute("alt")),
    ).toEqual(["a.png", "b.png", "c.png", "d.png"]);
  });

  it("keeps the page when a controlled filter is rebuilt with the same content", () => {
    const groups = [
      groupOf(
        ["a.png", "b.png", "c.png"].map((name, i) => figure(i + 1, name)),
      ),
    ];
    const props = { pageSize: 2, onFilterChange: vi.fn() };
    const { rerenderWith } = renderGroups(groups, {
      ...props,
      filter: { text: "", selections: {} },
    });
    fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();

    rerenderWith({ ...props, filter: { text: "", selections: {} } });
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
  });

  it("says when no figure matches the filters", async () => {
    renderGallery(["a.png"], 2);
    await typeFilter("zzz");
    expect(
      screen.getByText("No figures found matching your filters."),
    ).toBeInTheDocument();
  });

  it("narrows another selector's options and keeps a matching figure", () => {
    renderGroups(
      [
        groupWithSelectors(1, "gfdl.png", {
          cmip6: [
            ["source_id", "GFDL"],
            ["experiment_id", "historical"],
          ],
        }),
        groupWithSelectors(2, "access.png", {
          cmip6: [
            ["source_id", "ACCESS"],
            ["experiment_id", "ssp585"],
          ],
        }),
      ],
      { pageSize: 12 },
    );

    fireEvent.click(screen.getByRole("button", { name: /source_id/ }));
    fireEvent.click(screen.getByRole("option", { name: /^GFDL/ }));

    fireEvent.click(screen.getByRole("button", { name: /experiment_id/ }));
    expect(
      screen.getByRole("option", { name: /historical/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: /ssp585/ }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole("img")).toHaveLength(1);
  });

  it("lets figures without a tagged dimension be picked as unknown", () => {
    const tagged = (id: number, filename: string, region?: string) =>
      ({
        id,
        key: filename,
        selectors: {},
        executions: [
          {
            outputs: [
              {
                ...figure(id, filename),
                dimensions: region ? { region } : {},
              },
            ],
          } as Execution,
        ],
      }) as ExecutionGroup;
    renderGroups(
      [
        tagged(1, "med.png", "Mediterranean"),
        tagged(2, "waf.png", "Western-Africa"),
        tagged(3, "old.png"),
      ],
      { pageSize: 12 },
    );

    fireEvent.click(screen.getByRole("button", { name: /region/ }));
    fireEvent.click(screen.getByRole("option", { name: /^Unknown/ }));

    expect(
      screen.getAllByRole("img").map((img) => img.getAttribute("alt")),
    ).toEqual(["old.png"]);
    expect(screen.getByText("region: Unknown")).toBeInTheDocument();
  });

  it("reports changes through onFilterChange when controlled", async () => {
    const onFilterChange = vi.fn();
    renderGroups(
      [
        groupWithSelectors(1, "gfdl.png", { cmip6: [["source_id", "GFDL"]] }),
        groupWithSelectors(2, "access.png", {
          cmip6: [["source_id", "ACCESS"]],
        }),
      ],
      {
        pageSize: 12,
        filter: { text: "", selections: {} },
        onFilterChange,
      },
    );

    fireEvent.change(filterInput(), { target: { value: "bias" } });
    expect(onFilterChange).not.toHaveBeenCalled();
    await act(() => new Promise((resolve) => setTimeout(resolve, 350)));
    expect(onFilterChange).toHaveBeenLastCalledWith({
      text: "bias",
      selections: {},
    });

    fireEvent.click(screen.getByRole("button", { name: /source_id/ }));
    fireEvent.click(screen.getByRole("option", { name: /^GFDL/ }));
    expect(onFilterChange).toHaveBeenLastCalledWith({
      text: "",
      selections: { source_id: ["GFDL"] },
    });
  });
});
