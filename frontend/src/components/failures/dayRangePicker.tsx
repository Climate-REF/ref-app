import { format, subMonths, subWeeks } from "date-fns";
import { CalendarDays, ChevronsUpDown } from "lucide-react";
import { type CSSProperties, useState } from "react";
import { type DateRange, DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/** A range of days as YYYY-MM-DD, either end left open */
export interface DayRange {
  from?: string;
  to?: string;
}

const toDay = (date: Date) => format(date, "yyyy-MM-dd");
/** A YYYY-MM-DD day as a local date, so the calendar shows that day whatever the time zone */
const toDate = (day: string) => {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year, month - 1, date);
};
const display = (day: string) => format(toDate(day), "d MMM yyyy");

/** Common ranges, ending today; "All time" clears the range */
const PRESETS: { label: string; range: () => DayRange }[] = [
  {
    label: "Last week",
    range: () => ({
      from: toDay(subWeeks(new Date(), 1)),
      to: toDay(new Date()),
    }),
  },
  {
    label: "Last month",
    range: () => ({
      from: toDay(subMonths(new Date(), 1)),
      to: toDay(new Date()),
    }),
  },
  {
    label: "Last 3 months",
    range: () => ({
      from: toDay(subMonths(new Date(), 3)),
      to: toDay(new Date()),
    }),
  },
  { label: "All time", range: () => ({}) },
];

const presetOf = (range: DayRange) =>
  PRESETS.find(({ range: preset }) => {
    const { from, to } = preset();
    return from === range.from && to === range.to;
  })?.label;

/** The calendar themed with the app's colours, which follow light and dark mode */
const CALENDAR_THEME = {
  "--rdp-accent-color": "var(--primary)",
  "--rdp-accent-background-color": "var(--accent)",
  "--rdp-range_start-color": "var(--primary-foreground)",
  "--rdp-range_end-color": "var(--primary-foreground)",
  "--rdp-day-height": "2.25rem",
  "--rdp-day-width": "2.25rem",
  "--rdp-day_button-height": "2.125rem",
  "--rdp-day_button-width": "2.125rem",
  "--rdp-months-gap": "1.5rem",
} as CSSProperties;

/**
 * Pick a range of days in one calendar, or one of the common ranges
 *
 * Without a range, the full span of `allDays` is shown as selected, since that is what the page shows.
 */
export function DayRangePicker({
  value,
  allDays,
  markedDays,
  onChange,
  disabled,
}: {
  value: DayRange;
  /** The first and last day there is anything to show */
  allDays?: { from: string; to: string };
  /** Days to mark in the calendar, such as the days something failed */
  markedDays?: Set<string>;
  onChange: (range: DayRange) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const filtered = value.from !== undefined || value.to !== undefined;
  // Without a range the whole span is selected. A range being picked keeps its open end open,
  // so the next click completes it rather than starting a new one.
  const shown = filtered ? value : { from: allDays?.from, to: allDays?.to };
  const selected: DateRange | undefined = shown.from
    ? { from: toDate(shown.from), to: shown.to ? toDate(shown.to) : undefined }
    : undefined;

  const label = !filtered
    ? "All time"
    : (presetOf(value) ??
      `${value.from ? display(value.from) : "…"} – ${value.to ? display(value.to) : "…"}`);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className={cn("justify-between", filtered && "border-primary")}
        >
          <CalendarDays className="size-4 opacity-60" />
          <span>
            <span className="text-muted-foreground">Failed:</span> {label}
          </span>
          <ChevronsUpDown className="size-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="flex w-auto max-w-[calc(100vw-2rem)] flex-col gap-3 p-3 sm:flex-row"
        align="start"
      >
        <div className="flex flex-wrap gap-1 sm:w-32 sm:flex-col">
          {PRESETS.map((preset) => (
            <Button
              key={preset.label}
              variant={
                (
                  preset.label === "All time"
                    ? !filtered
                    : presetOf(value) === preset.label
                )
                  ? "secondary"
                  : "ghost"
              }
              size="sm"
              className="justify-start"
              onClick={() => {
                onChange(preset.range());
                setOpen(false);
              }}
            >
              {preset.label}
            </Button>
          ))}
        </div>
        <DayPicker
          mode="range"
          resetOnSelect
          numberOfMonths={2}
          defaultMonth={shown.to ? subMonths(toDate(shown.to), 1) : undefined}
          selected={selected}
          onSelect={(range) =>
            onChange({
              from: range?.from ? toDay(range.from) : undefined,
              to: range?.to ? toDay(range.to) : undefined,
            })
          }
          modifiers={{
            marked: (date) => markedDays?.has(toDay(date)) ?? false,
          }}
          modifiersClassNames={{
            marked:
              "relative after:pointer-events-none after:absolute after:bottom-0.5 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-destructive",
          }}
          style={CALENDAR_THEME}
          className="text-sm"
        />
      </PopoverContent>
    </Popover>
  );
}
