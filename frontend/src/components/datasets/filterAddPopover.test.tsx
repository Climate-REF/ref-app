import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { FilterAddPopover } from "./filterAddPopover";

beforeAll(() => {
  // Radix Select measures, scrolls and captures the pointer, which jsdom does not implement
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Element.prototype.scrollIntoView ??= () => {};
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.releasePointerCapture ??= () => {};
});

const facets = {
  source_id: ["CESM2", "GFDL"],
  experiment_id: ["historical"],
};

const FACET = 0;
const VALUE = 1;

/** The facet select (`FACET`) or the value select (`VALUE`). */
const select = (index: number) => screen.getAllByRole("combobox")[index];

/** Open a select and pick `option`. */
function pick(index: number, option: string) {
  fireEvent.keyDown(select(index), { key: "Enter" });
  fireEvent.keyDown(screen.getByRole("option", { name: option }), {
    key: "Enter",
  });
}

const addButton = () => screen.getByRole("button", { name: "Add" });

function renderPopover() {
  const onAdd = vi.fn();
  render(<FilterAddPopover facets={facets} onAdd={onAdd} />);
  fireEvent.click(screen.getByRole("button", { name: /Add Filter/ }));
  return onAdd;
}

describe("FilterAddPopover", () => {
  it("adds the picked facet value", () => {
    const onAdd = renderPopover();
    expect(addButton()).toBeDisabled();

    pick(FACET, "source_id");
    pick(VALUE, "GFDL");
    fireEvent.click(addButton());

    expect(onAdd).toHaveBeenCalledWith("source_id", "GFDL");
  });

  it("clears the shown value after adding, so the same value can be picked again", () => {
    const onAdd = renderPopover();
    pick(FACET, "source_id");
    pick(VALUE, "GFDL");
    fireEvent.click(addButton());

    expect(select(VALUE)).toHaveTextContent("Select a value");
    expect(addButton()).toBeDisabled();

    pick(VALUE, "GFDL");
    fireEvent.click(addButton());
    expect(onAdd).toHaveBeenCalledTimes(2);
  });

  it("clears the shown value when the facet changes", () => {
    renderPopover();
    pick(FACET, "source_id");
    pick(VALUE, "GFDL");
    expect(select(VALUE)).toHaveTextContent("GFDL");

    pick(FACET, "experiment_id");

    expect(select(FACET)).toHaveTextContent("experiment_id");
    expect(select(VALUE)).toHaveTextContent("Select a value");
    expect(addButton()).toBeDisabled();
  });
});
