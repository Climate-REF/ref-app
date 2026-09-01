import { describe, expect, it } from "vitest";
import { eraOf, modelFamily, sampleSize, splitByEra } from "@/lib/modelEras";

const value = (dimensions: Record<string, string>) => ({ dimensions });

describe("modelFamily", () => {
  it("takes the segment before the first hyphen", () => {
    expect(modelFamily("ACCESS-ESM1-5")).toBe("ACCESS");
    expect(modelFamily("ACCESS-CM2")).toBe("ACCESS");
    expect(modelFamily("MIROC6")).toBe("MIROC6");
  });
});

describe("eraOf", () => {
  it("reads the mip_id dimension case-insensitively", () => {
    expect(eraOf(value({ mip_id: "cmip6" }))).toBe("CMIP6");
    expect(eraOf(value({ mip_id: "CMIP7" }))).toBe("CMIP7");
  });

  it("returns null when the era is missing or unknown", () => {
    expect(eraOf(value({}))).toBeNull();
    expect(eraOf(value({ mip_id: "CMIP5" }))).toBeNull();
  });
});

describe("splitByEra", () => {
  it("keeps the two eras in separate buckets", () => {
    const sections = splitByEra([
      value({ mip_id: "CMIP7", source_id: "A" }),
      value({ mip_id: "CMIP6", source_id: "B" }),
    ]);
    expect(sections.map((s) => s.era)).toEqual(["CMIP6", "CMIP7"]);
    expect(sections[0].values).toHaveLength(1);
  });

  it("repeats era-less values in every bucket", () => {
    const reference = value({ source_id: "HadISST" });
    const sections = splitByEra([
      value({ mip_id: "CMIP6", source_id: "A" }),
      value({ mip_id: "CMIP7", source_id: "B" }),
      reference,
    ]);
    expect(sections).toHaveLength(2);
    for (const section of sections) {
      expect(section.values).toContain(reference);
    }
  });

  it("returns a single unlabelled bucket when no era is recorded", () => {
    const sections = splitByEra([value({ source_id: "A" })]);
    expect(sections).toEqual([
      { era: null, values: [value({ source_id: "A" })] },
    ]);
  });

  it("returns nothing for no values", () => {
    expect(splitByEra([])).toEqual([]);
  });
});

describe("sampleSize", () => {
  it("counts distinct models and families, ignoring references", () => {
    const result = sampleSize([
      value({ source_id: "ACCESS-CM2" }),
      value({ source_id: "ACCESS-CM2" }),
      value({ source_id: "ACCESS-ESM1-5" }),
      value({ source_id: "MIROC6" }),
      { dimensions: { source_id: "HadISST" }, kind: "reference" as const },
    ]);
    expect(result.models).toBe(3);
    expect(result.families).toBe(2);
  });

  it("needs more than three models before a chart is drawn", () => {
    const models = ["a", "b", "c"].map((s) => value({ source_id: s }));
    expect(sampleSize(models).enoughModels).toBe(false);
    expect(
      sampleSize([...models, value({ source_id: "d" })]).enoughModels,
    ).toBe(true);
  });

  it("flags a sample drawn from fewer than ten families", () => {
    const nine = Array.from({ length: 9 }, (_, i) =>
      value({ source_id: `M${i}` }),
    );
    expect(sampleSize(nine).sparseFamilies).toBe(true);
    expect(
      sampleSize([...nine, value({ source_id: "M9" })]).sparseFamilies,
    ).toBe(false);
  });
});
