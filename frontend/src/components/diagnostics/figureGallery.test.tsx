import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Execution, ExecutionGroup, ExecutionOutput } from "@/client";
import { diagnosticsListExecutionGroupsOptions } from "@/client/@tanstack/react-query.gen.ts";
import { FigureGallery } from "./figureGallery";

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

function renderGallery(filenames: string[], pageSize?: number) {
  const queryClient = new QueryClient();
  const path = { provider_slug: "pmp", diagnostic_slug: "enso" };
  queryClient.setQueryData(
    diagnosticsListExecutionGroupsOptions({ path, query: {} }).queryKey,
    {
      count: 1,
      data: [groupOf(filenames.map((name, i) => figure(i + 1, name)))],
    },
  );
  return render(
    <QueryClientProvider client={queryClient}>
      <FigureGallery
        providerSlug="pmp"
        diagnosticSlug="enso"
        pageSize={pageSize}
      />
    </QueryClientProvider>,
  );
}

const filterInput = () => screen.getByLabelText("Filter by Figure Name");

describe("FigureGallery", () => {
  it("goes back to the first page when the filter changes", () => {
    renderGallery(["a1.png", "a2.png", "a3.png", "b.png"], 2);
    fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();

    fireEvent.change(filterInput(), { target: { value: "^a" } });
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

  it("says when no figure matches the filters", () => {
    renderGallery(["a.png"], 2);
    fireEvent.change(filterInput(), { target: { value: "zzz" } });
    expect(
      screen.getByText("No figures found matching your filters."),
    ).toBeInTheDocument();
  });
});
