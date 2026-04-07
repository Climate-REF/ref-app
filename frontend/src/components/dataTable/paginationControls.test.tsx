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

  it("disables previous buttons on first page", () => {
    render(<PaginationControls {...defaultProps} offset={0} />);
    const buttons = screen.getAllByRole("button");
    // First two buttons are first-page and previous-page
    expect(buttons[0]).toBeDisabled();
    expect(buttons[1]).toBeDisabled();
    // Last two buttons are next-page and last-page
    expect(buttons[2]).not.toBeDisabled();
    expect(buttons[3]).not.toBeDisabled();
  });

  it("disables next buttons on last page", () => {
    render(<PaginationControls {...defaultProps} offset={150} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).not.toBeDisabled();
    expect(buttons[1]).not.toBeDisabled();
    expect(buttons[2]).toBeDisabled();
    expect(buttons[3]).toBeDisabled();
  });

  it("disables all nav buttons when only one page exists", () => {
    render(<PaginationControls {...defaultProps} totalCount={10} limit={50} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).toBeDisabled();
    expect(buttons[1]).toBeDisabled();
    expect(buttons[2]).toBeDisabled();
    expect(buttons[3]).toBeDisabled();
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
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]); // first-page button
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
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]); // previous-page button
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
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[2]); // next-page button
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
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[3]); // last-page button
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
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]); // previous-page button
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
