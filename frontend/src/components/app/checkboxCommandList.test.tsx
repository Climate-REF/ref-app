import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { CheckboxCommandList } from "./checkboxCommandList";

beforeAll(() => {
  // cmdk measures and scrolls its items, which jsdom does not implement
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Element.prototype.scrollIntoView ??= () => {};
});

function renderList(selected: string[]) {
  const onSelectedChange = vi.fn();
  render(
    <CheckboxCommandList
      values={["A", "B", "C"]}
      selected={selected}
      onSelectedChange={onSelectedChange}
      placeholder="Search values..."
    />,
  );
  return onSelectedChange;
}

describe("CheckboxCommandList", () => {
  it("adds a value that is not selected", () => {
    const onSelectedChange = renderList(["A"]);
    fireEvent.click(screen.getByText("C"));
    expect(onSelectedChange).toHaveBeenCalledWith(["A", "C"]);
  });

  it("removes a value that is selected", () => {
    const onSelectedChange = renderList(["A", "B"]);
    fireEvent.click(screen.getByText("A"));
    expect(onSelectedChange).toHaveBeenCalledWith(["B"]);
  });
});
