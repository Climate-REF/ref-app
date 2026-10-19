import { fireEvent, render, screen } from "@testing-library/react";
import { format, subWeeks } from "date-fns";
import { describe, expect, it, vi } from "vitest";
import { DayRangePicker } from "./dayRangePicker";

const allDays = { from: "2026-07-16", to: "2026-09-20" };

describe("DayRangePicker", () => {
  it("reads all time without a range", () => {
    render(<DayRangePicker value={{}} allDays={allDays} onChange={() => {}} />);
    expect(
      screen.getByRole("button", { name: /Failed: All time/ }),
    ).toBeInTheDocument();
  });

  it("names a picked range by its days", () => {
    render(
      <DayRangePicker
        value={{ from: "2026-09-01", to: "2026-09-15" }}
        allDays={allDays}
        onChange={() => {}}
      />,
    );
    expect(
      screen.getByRole("button", { name: /Failed: 1 Sep 2026 – 15 Sep 2026/ }),
    ).toBeInTheDocument();
  });

  it("picks a common range ending today", () => {
    const onChange = vi.fn();
    render(<DayRangePicker value={{}} allDays={allDays} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /Failed:/ }));
    fireEvent.click(screen.getByRole("button", { name: "Last week" }));

    const today = new Date();
    expect(onChange).toHaveBeenCalledWith({
      from: format(subWeeks(today, 1), "yyyy-MM-dd"),
      to: format(today, "yyyy-MM-dd"),
    });
  });

  it("clears the range for all time", () => {
    const onChange = vi.fn();
    render(
      <DayRangePicker
        value={{ from: "2026-09-01", to: "2026-09-15" }}
        allDays={allDays}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Failed:/ }));
    fireEvent.click(screen.getByRole("button", { name: "All time" }));
    expect(onChange).toHaveBeenCalledWith({});
  });

  it("names a preset it matches", () => {
    const today = new Date();
    render(
      <DayRangePicker
        value={{
          from: format(subWeeks(today, 1), "yyyy-MM-dd"),
          to: format(today, "yyyy-MM-dd"),
        }}
        allDays={allDays}
        onChange={() => {}}
      />,
    );
    expect(
      screen.getByRole("button", { name: /Failed: Last week/ }),
    ).toBeInTheDocument();
  });
});
