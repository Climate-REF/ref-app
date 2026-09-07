import { describe, expect, it } from "vitest";
import { ipccRegionName } from "./ipccRegions";

describe("ipccRegionName", () => {
  it("expands a known AR6 code", () => {
    expect(ipccRegionName("SEAF")).toBe("South-Eastern Africa");
  });

  it("leaves unknown values alone", () => {
    expect(ipccRegionName("Global")).toBe("Global");
  });
});
