import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DebouncedInput } from "./debouncedInput";

describe("DebouncedInput", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reports only the last change once typing pauses", () => {
    const onValueChange = vi.fn();
    render(<DebouncedInput value="" onValueChange={onValueChange} />);
    const input = screen.getByRole("textbox");

    fireEvent.change(input, { target: { value: "a" } });
    fireEvent.change(input, { target: { value: "ab" } });
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(onValueChange).not.toHaveBeenCalled();
    expect(input).toHaveValue("ab");

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith("ab");
  });

  it("follows a value cleared from outside and drops the pending change", () => {
    const onValueChange = vi.fn();
    const { rerender } = render(
      <DebouncedInput value="old" onValueChange={onValueChange} />,
    );
    const input = screen.getByRole("textbox");

    fireEvent.change(input, { target: { value: "older" } });
    rerender(<DebouncedInput value="" onValueChange={onValueChange} />);
    act(() => {
      vi.runAllTimers();
    });

    expect(input).toHaveValue("");
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("keeps the typed text when its own change comes back as the value", () => {
    const onValueChange = vi.fn();
    const { rerender } = render(
      <DebouncedInput value="" onValueChange={onValueChange} />,
    );
    const input = screen.getByRole("textbox");

    fireEvent.change(input, { target: { value: "ab" } });
    act(() => {
      vi.runAllTimers();
    });
    fireEvent.change(input, { target: { value: "abc" } });
    rerender(<DebouncedInput value="ab" onValueChange={onValueChange} />);

    expect(input).toHaveValue("abc");
  });
});
