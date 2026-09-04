import { describe, expect, it } from "vitest";
import type { DiagnosticSummary } from "@/client";
import { resourceUsageCsv } from "./resourceUsageCsv";

const base = {
  id: 1,
  description: "",
  execution_groups: [],
  has_metric_values: false,
  has_scalar_values: false,
  has_series_values: false,
  execution_count: 1,
  successful_execution_count: 1,
  execution_group_count: 1,
  successful_execution_group_count: 1,
  promoted_version: 1,
  group_by: [],
  aft_link: null,
};

function diagnostic(
  name: string,
  wall: number | null,
  cpu: number | null,
): DiagnosticSummary {
  return {
    ...base,
    name,
    slug: name.toLowerCase(),
    provider: { slug: "pmp", name: "PMP" },
    resource_usage:
      wall === null
        ? null
        : {
            timed_execution_count: 2,
            wall_seconds_total: wall,
            wall_seconds_mean: wall / 2,
            wall_seconds_max: wall,
            cpu_seconds_total: cpu,
            cpu_seconds_mean: cpu === null ? null : cpu / 2,
            peak_memory_bytes_min: 512,
            peak_memory_bytes_max: 1024,
          },
  } as DiagnosticSummary;
}

describe("resourceUsageCsv", () => {
  it("orders by core hours with untimed rows last", () => {
    const csv = resourceUsageCsv([
      diagnostic("Slow", 30, 10),
      diagnostic("Untimed", null, null),
      diagnostic("Fast, quick", 200, 100),
    ]);
    const lines = csv.split("\n");
    expect(lines[0]).toBe(
      "provider,diagnostic,slug,timed_execution_count,wall_seconds_total,wall_seconds_mean,wall_seconds_max,cpu_seconds_total,cpu_seconds_mean,peak_memory_bytes_min,peak_memory_bytes_max",
    );
    expect(lines[1]).toBe(
      'PMP,"Fast, quick","fast, quick",2,200,100,200,100,50,512,1024',
    );
    expect(lines[2]).toBe("PMP,Slow,slow,2,30,15,30,10,5,512,1024");
    expect(lines[3]).toBe("PMP,Untimed,untimed,,,,,,,,");
  });

  it("puts a diagnostic without CPU time last, even when its wall time is long", () => {
    const csv = resourceUsageCsv([
      diagnostic("No CPU", 1000, null),
      diagnostic("Small", 10, 5),
    ]);
    const lines = csv.split("\n");
    expect(lines[1]).toBe("PMP,Small,small,2,10,5,10,5,2.5,512,1024");
    expect(lines[2]).toBe("PMP,No CPU,no cpu,2,1000,500,1000,,,512,1024");
  });
});
