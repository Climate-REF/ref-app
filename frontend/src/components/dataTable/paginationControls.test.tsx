import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PaginationControls } from "./paginationControls";

describe("PaginationControls", () => {
  const defaultProps = {
    offset: 0,
    limit: 50,
    totalCount: 200,
    onOffsetChange: vi.fn(),
    onLimitChange: vi.fn(),
  };

  it("renders showing range text correctly", () => {
    render(<PaginationControls {...defaultProps} />);
    expect(screen.getByText("Showing 1-50 of 200")).toBeInTheDocument();
  });

  it("renders page info correctly", () => {
    render(<PaginationControls {...defaultProps} />);
    expect(screen.getByText("Page 1 of 4")).toBeInTheDocument();
  });

  it("shows correct range for middle page", () => {
    render(<PaginationControls {...defaultProps} offset={100} />);
    expect(screen.getByText("Showing 101-150 of 200")).toBeInTheDocument();
    expect(screen.getByText("Page 3 of 4")).toBeInTheDocument();
  });

  it("shows correct range for last page with partial results", () => {
    render(<PaginationControls {...defaultProps} offset={150} />);
    expect(screen.getByText("Showing 151-200 of 200")).toBeInTheDocument();
    expect(screen.getByText("Page 4 of 4")).toBeInTheDocument();
  });

  it("shows 'No results' when totalCount is 0", () => {
    render(<PaginationControls {...defaultProps} totalCount={0} />);
    expect(screen.getByText("No results")).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 1")).toBeInTheDocument();
  });

  it("clamps display when offset exceeds totalCount", () => {
    render(
      <PaginationControls {...defaultProps} offset={250} totalCount={200} />,
    );
    expect(screen.getByText("No results")).toBeInTheDocument();
    expect(screen.getByText("Page 4 of 4")).toBeInTheDocument();
  });

  it("disables previous buttons on first page", () => {
    render(<PaginationControls {...defaultProps} offset={0} />);
    expect(screen.getByRole("button", { name: "First page" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Previous page" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Next page" }),
    ).not.toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Last page" }),
    ).not.toBeDisabled();
  });

  it("disables next buttons on last page", () => {
    render(<PaginationControls {...defaultProps} offset={150} />);
    expect(
      screen.getByRole("button", { name: "First page" }),
    ).not.toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Previous page" }),
    ).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Last page" })).toBeDisabled();
  });

  it("disables all nav buttons when only one page exists", () => {
    render(<PaginationControls {...defaultProps} totalCount={10} limit={50} />);
    expect(screen.getByRole("button", { name: "First page" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Previous page" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Last page" })).toBeDisabled();
  });

  it("calls onOffsetChange(0) when first-page button is clicked", () => {
    const onOffsetChange = vi.fn();
    render(
      <PaginationControls
        {...defaultProps}
        offset={100}
        onOffsetChange={onOffsetChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "First page" }));
    expect(onOffsetChange).toHaveBeenCalledWith(0);
  });

  it("calls onOffsetChange with previous page offset when prev button is clicked", () => {
    const onOffsetChange = vi.fn();
    render(
      <PaginationControls
        {...defaultProps}
        offset={100}
        onOffsetChange={onOffsetChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
    expect(onOffsetChange).toHaveBeenCalledWith(50);
  });

  it("calls onOffsetChange with next page offset when next button is clicked", () => {
    const onOffsetChange = vi.fn();
    render(
      <PaginationControls
        {...defaultProps}
        offset={50}
        onOffsetChange={onOffsetChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(onOffsetChange).toHaveBeenCalledWith(100);
  });

  it("calls onOffsetChange with last page offset when last button is clicked", () => {
    const onOffsetChange = vi.fn();
    render(
      <PaginationControls
        {...defaultProps}
        offset={0}
        onOffsetChange={onOffsetChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Last page" }));
    expect(onOffsetChange).toHaveBeenCalledWith(150);
  });

  it("clamps previous page offset to 0", () => {
    const onOffsetChange = vi.fn();
    render(
      <PaginationControls
        {...defaultProps}
        offset={20}
        limit={50}
        onOffsetChange={onOffsetChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
    expect(onOffsetChange).toHaveBeenCalledWith(0);
  });

  it("calculates page numbers correctly with non-standard page sizes", () => {
    render(
      <PaginationControls
        {...defaultProps}
        offset={75}
        limit={25}
        totalCount={200}
      />,
    );
    expect(screen.getByText("Showing 76-100 of 200")).toBeInTheDocument();
    expect(screen.getByText("Page 4 of 8")).toBeInTheDocument();
  });

  it("handles single-item total correctly", () => {
    render(
      <PaginationControls
        {...defaultProps}
        offset={0}
        limit={50}
        totalCount={1}
      />,
    );
    expect(screen.getByText("Showing 1-1 of 1")).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 1")).toBeInTheDocument();
  });
});
