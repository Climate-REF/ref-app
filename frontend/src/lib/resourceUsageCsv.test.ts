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
  group_by: [],
  aft_link: null,
};

function diagnostic(name: string, cpu: number | null): DiagnosticSummary {
  return {
    ...base,
    name,
    slug: name.toLowerCase(),
    provider: { slug: "pmp", name: "PMP" },
    resource_usage:
      cpu === null
        ? null
        : {
            timed_execution_count: 2,
            wall_seconds_total: cpu,
            wall_seconds_mean: cpu / 2,
            wall_seconds_max: cpu,
            cpu_seconds_total: cpu,
            cpu_seconds_mean: cpu / 2,
            peak_memory_bytes_max: 1024,
          },
  } as DiagnosticSummary;
}

describe("resourceUsageCsv", () => {
  it("orders by core hours with untimed rows last", () => {
    const csv = resourceUsageCsv([
      diagnostic("Slow", 10),
      diagnostic("Untimed", null),
      diagnostic("Fast, quick", 100),
    ]);
    const lines = csv.split("\n");
    expect(lines[0]).toBe(
      "provider,diagnostic,slug,timed_execution_count,wall_seconds_total,wall_seconds_mean,wall_seconds_max,cpu_seconds_total,cpu_seconds_mean,peak_memory_bytes_max",
    );
    expect(lines[1]).toBe(
      'PMP,"Fast, quick","fast, quick",2,100,50,100,100,50,1024',
    );
    expect(lines[2]).toBe("PMP,Slow,slow,2,10,5,10,10,5,1024");
    expect(lines[3]).toBe("PMP,Untimed,untimed,,,,,,,");
  });
});
