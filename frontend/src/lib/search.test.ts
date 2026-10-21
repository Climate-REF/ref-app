import { describe, expect, it } from "vitest";
import { dropEmpty } from "./search";

describe("dropEmpty", () => {
  it("drops undefined and empty string values", () => {
    expect(
      dropEmpty({
        diagnostic_name_contains: "",
        provider_name_contains: undefined,
        dirty: "true",
        mip_era: "CMIP6",
      }),
    ).toEqual({ dirty: "true", mip_era: "CMIP6" });
  });

  it("keeps other falsy values", () => {
    expect(dropEmpty({ offset: 0, flag: false, value: null })).toEqual({
      offset: 0,
      flag: false,
      value: null,
    });
  });

  it("leaves the search it was given unchanged", () => {
    const search = { a: "", b: "x" };
    dropEmpty(search);
    expect(search).toEqual({ a: "", b: "x" });
  });
});
