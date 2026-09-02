import { describe, expect, it } from "vitest";
import { eraOf, modelFamily, sampleSize, splitByEra } from "@/lib/modelEras";

const model = (dimensions: Record<string, string>) => ({ dimensions });
const reference = (dimensions: Record<string, string>) => ({
  dimensions,
  kind: "reference" as const,
});

describe("modelFamily", () => {
  it("takes the segment before the first hyphen", () => {
    expect(modelFamily("ACCESS-ESM1-5")).toBe("ACCESS");
    expect(modelFamily("ACCESS-CM2")).toBe("ACCESS");
    expect(modelFamily("MIROC6")).toBe("MIROC6");
  });
});

describe("eraOf", () => {
  it("reads the mip_id dimension case-insensitively", () => {
    expect(eraOf(model({ mip_id: "cmip6" }))).toBe("CMIP6");
    expect(eraOf(model({ mip_id: "CMIP7" }))).toBe("CMIP7");
  });

  it("returns null when the era is missing or unknown", () => {
    expect(eraOf(model({}))).toBeNull();
    expect(eraOf(model({ mip_id: "CMIP5" }))).toBeNull();
  });
});

describe("splitByEra", () => {
  it("keeps the two eras in separate buckets", () => {
    const sections = splitByEra([
      model({ mip_id: "CMIP7", source_id: "A" }),
      model({ mip_id: "CMIP6", source_id: "B" }),
    ]);
    expect(sections.map((s) => s.era)).toEqual(["CMIP6", "CMIP7"]);
    expect(sections[0].values).toHaveLength(1);
  });

  it("repeats reference values in every bucket", () => {
    const baseline = reference({ source_id: "HadISST" });
    const sections = splitByEra([
      model({ mip_id: "CMIP6", source_id: "A" }),
      model({ mip_id: "CMIP7", source_id: "B" }),
      baseline,
    ]);
    expect(sections).toHaveLength(2);
    for (const section of sections) {
      expect(section.values).toContain(baseline);
    }
  });

  it("never repeats an untagged model value into an era bucket", () => {
    const untagged = model({ source_id: "A" });
    const sections = splitByEra([
      model({ mip_id: "CMIP7", source_id: "B" }),
      untagged,
    ]);
    expect(sections.map((s) => s.era)).toEqual(["CMIP7", null]);
    expect(sections[0].values).not.toContain(untagged);
    expect(sections[1].values).toEqual([untagged]);
  });

  it("returns a single unlabelled bucket when no era is recorded", () => {
    const sections = splitByEra([model({ source_id: "A" })]);
    expect(sections).toHaveLength(1);
    expect(sections[0].era).toBeNull();
  });

  it("returns nothing for no values", () => {
    expect(splitByEra([])).toEqual([]);
  });
});

describe("sampleSize", () => {
  it("counts distinct models and families, ignoring references", () => {
    const result = sampleSize([
      model({ source_id: "ACCESS-CM2" }),
      model({ source_id: "ACCESS-CM2" }),
      model({ source_id: "ACCESS-ESM1-5" }),
      model({ source_id: "MIROC6" }),
      reference({ source_id: "HadISST" }),
    ]);
    expect(result.models).toBe(3);
    expect(result.families).toBe(2);
  });

  it("needs more than three models before a chart is drawn", () => {
    const three = ["a", "b", "c"].map((s) => model({ source_id: s }));
    expect(sampleSize(three).enoughModels).toBe(false);
    expect(sampleSize([...three, model({ source_id: "d" })]).enoughModels).toBe(
      true,
    );
  });

  it("flags a sample drawn from fewer than ten families", () => {
    const nine = Array.from({ length: 9 }, (_, i) =>
      model({ source_id: `M${i}` }),
    );
    expect(sampleSize(nine).sparseFamilies).toBe(true);
    expect(
      sampleSize([...nine, model({ source_id: "M9" })]).sparseFamilies,
    ).toBe(false);
  });

  it("does not gate data that is not dimensioned by model", () => {
    const result = sampleSize([
      model({ region: "global" }),
      model({ region: "tropics" }),
    ]);
    expect(result.gated).toBe(false);
    expect(result.enoughModels).toBe(true);
    expect(result.sparseFamilies).toBe(false);
  });
});
