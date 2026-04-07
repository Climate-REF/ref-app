import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PAGE_SIZE, useMetricValues } from "./useMetricValues";

// Mock useQuery to return controlled data without a real backend
vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual("@tanstack/react-query");
  return {
    ...actual,
    useQuery: vi.fn(),
  };
});

import { useQuery } from "@tanstack/react-query";

const mockedUseQuery = vi.mocked(useQuery);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

function createMockNavigate() {
  return vi.fn();
}

function createDefaultOptions(overrides: Record<string, any> = {}) {
  return {
    pathParams: { providerSlug: "test-provider", diagnosticSlug: "test-diag" },
    search: {
      detect_outliers: "iqr",
      include_unverified: "false",
      ...overrides,
    },
    valueType: "scalar" as const,
    navigate: createMockNavigate(),
    fetchQueryOptions: vi.fn().mockReturnValue({
      queryKey: ["test"],
      queryFn: () => Promise.resolve(null),
    }),
    fetchDownload: vi.fn().mockResolvedValue({ data: "csv-data" }),
    getDownloadFilename: vi.fn().mockReturnValue("test.csv"),
  };
}

const MOCK_METRIC_VALUES = {
  data: [{ id: 1 }, { id: 2 }],
  count: 2,
  total_count: 100,
  facets: [{ key: "model", values: ["a", "b"] }],
  types: ["scalar"],
  had_outliers: false,
  outlier_count: 0,
};

describe("useMetricValues", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseQuery.mockReturnValue({
      data: MOCK_METRIC_VALUES,
      isLoading: false,
    } as any);
  });

  describe("pagination state", () => {
    it("returns default pagination values when search has no offset/limit", () => {
      const options = createDefaultOptions();
      const { result } = renderHook(() => useMetricValues(options), {
        wrapper: createWrapper(),
      });

      expect(result.current.pagination.offset).toBe(0);
      expect(result.current.pagination.limit).toBe(DEFAULT_PAGE_SIZE);
      expect(result.current.pagination.totalCount).toBe(100);
    });

    it("reads offset and limit from search params", () => {
      const options = createDefaultOptions({ offset: "25", limit: "100" });
      const { result } = renderHook(() => useMetricValues(options), {
        wrapper: createWrapper(),
      });

      expect(result.current.pagination.offset).toBe(25);
      expect(result.current.pagination.limit).toBe(100);
    });

    it("returns totalCount of 0 when no data is loaded", () => {
      mockedUseQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
      } as any);
      const options = createDefaultOptions();
      const { result } = renderHook(() => useMetricValues(options), {
        wrapper: createWrapper(),
      });

      expect(result.current.pagination.totalCount).toBe(0);
      expect(result.current.isLoading).toBe(true);
    });
  });

  describe("pagination handlers", () => {
    it("onOffsetChange navigates with the new offset", () => {
      const options = createDefaultOptions({ offset: 0 });
      const { result } = renderHook(() => useMetricValues(options), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.pagination.onOffsetChange(50);
      });

      expect(options.navigate).toHaveBeenCalledWith(
        expect.objectContaining({
          search: expect.objectContaining({ offset: 50 }),
          replace: true,
        }),
      );
    });

    it("onLimitChange navigates with the new limit and resets offset to 0", () => {
      const options = createDefaultOptions({ offset: 100, limit: 50 });
      const { result } = renderHook(() => useMetricValues(options), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.pagination.onLimitChange(25);
      });

      expect(options.navigate).toHaveBeenCalledWith(
        expect.objectContaining({
          search: expect.objectContaining({ limit: 25, offset: 0 }),
          replace: true,
        }),
      );
    });
  });

  describe("filter changes reset pagination", () => {
    it("onFiltersChange resets offset to 0", () => {
      const options = createDefaultOptions({ offset: 100, limit: 50 });
      const { result } = renderHook(() => useMetricValues(options), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handlers.onFiltersChange([
          { type: "facet", id: "1", facetKey: "model", values: ["a"] },
        ]);
      });

      expect(options.navigate).toHaveBeenCalledWith(
        expect.objectContaining({
          search: expect.objectContaining({ offset: 0 }),
          replace: true,
        }),
      );
    });

    it("onFiltersChange preserves current limit when set", () => {
      const options = createDefaultOptions({ offset: 100, limit: 100 });
      const { result } = renderHook(() => useMetricValues(options), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handlers.onFiltersChange([]);
      });

      expect(options.navigate).toHaveBeenCalledWith(
        expect.objectContaining({
          search: expect.objectContaining({ limit: 100, offset: 0 }),
          replace: true,
        }),
      );
    });

    it("onDetectOutliersChange resets offset to 0", () => {
      const options = createDefaultOptions({
        offset: 50,
        detect_outliers: "iqr",
      });
      const { result } = renderHook(() => useMetricValues(options), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handlers.onDetectOutliersChange("off");
      });

      expect(options.navigate).toHaveBeenCalledWith(
        expect.objectContaining({
          search: expect.objectContaining({
            detect_outliers: "off",
            offset: 0,
          }),
          replace: true,
        }),
      );
    });

    it("onIncludeUnverifiedChange resets offset to 0", () => {
      const options = createDefaultOptions({
        offset: 50,
        include_unverified: "false",
      });
      const { result } = renderHook(() => useMetricValues(options), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handlers.onIncludeUnverifiedChange(true);
      });

      expect(options.navigate).toHaveBeenCalledWith(
        expect.objectContaining({
          search: expect.objectContaining({
            include_unverified: "true",
            offset: 0,
          }),
          replace: true,
        }),
      );
    });
  });

  describe("filter extraction", () => {
    it("excludes pagination params from currentFilters", () => {
      const options = createDefaultOptions({
        offset: 50,
        limit: 25,
        model: "cesm2",
      });
      const { result } = renderHook(() => useMetricValues(options), {
        wrapper: createWrapper(),
      });

      expect(result.current.currentFilters).toHaveProperty("model", "cesm2");
      expect(result.current.currentFilters).not.toHaveProperty("offset");
      expect(result.current.currentFilters).not.toHaveProperty("limit");
      expect(result.current.currentFilters).not.toHaveProperty(
        "detect_outliers",
      );
      expect(result.current.currentFilters).not.toHaveProperty(
        "include_unverified",
      );
    });

    it("excludes UI params from currentFilters", () => {
      const options = createDefaultOptions({
        tab: "series",
        groupBy: "model",
        hue: "experiment",
        style: "variant",
      });
      const { result } = renderHook(() => useMetricValues(options), {
        wrapper: createWrapper(),
      });

      expect(result.current.currentFilters).not.toHaveProperty("tab");
      expect(result.current.currentFilters).not.toHaveProperty("groupBy");
      expect(result.current.currentFilters).not.toHaveProperty("hue");
      expect(result.current.currentFilters).not.toHaveProperty("style");
    });
  });

  describe("API query construction", () => {
    it("passes offset and limit to fetchQueryOptions", () => {
      const options = createDefaultOptions({ offset: 25, limit: 100 });
      renderHook(() => useMetricValues(options), {
        wrapper: createWrapper(),
      });

      expect(options.fetchQueryOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            offset: 25,
            limit: 100,
            value_type: "scalar",
          }),
        }),
      );
    });

    it("excludes UI-only params from API query", () => {
      const options = createDefaultOptions({
        tab: "series",
        groupBy: "model",
        hue: "experiment",
        style: "variant",
        offset: 0,
      });
      renderHook(() => useMetricValues(options), {
        wrapper: createWrapper(),
      });

      const queryArg = options.fetchQueryOptions.mock.calls[0][0].query;
      expect(queryArg).not.toHaveProperty("tab");
      expect(queryArg).not.toHaveProperty("groupBy");
      expect(queryArg).not.toHaveProperty("hue");
      expect(queryArg).not.toHaveProperty("style");
      expect(queryArg).toHaveProperty("offset", 0);
    });
  });

  describe("initialFilters", () => {
    it("builds facet filters from search params", () => {
      const options = createDefaultOptions({ model: "cesm2,gfdl" });
      const { result } = renderHook(() => useMetricValues(options), {
        wrapper: createWrapper(),
      });

      const facetFilter = result.current.initialFilters.find(
        (f: any) => f.type === "facet" && f.facetKey === "model",
      );
      expect(facetFilter).toBeDefined();
      expect(facetFilter.values).toEqual(["cesm2", "gfdl"]);
    });

    it("parses isolate_ids from search params", () => {
      const options = createDefaultOptions({ isolate_ids: "1,2,3" });
      const { result } = renderHook(() => useMetricValues(options), {
        wrapper: createWrapper(),
      });

      const isolateFilter = result.current.initialFilters.find(
        (f: any) => f.type === "isolate",
      );
      expect(isolateFilter).toBeDefined();
      expect(isolateFilter.ids).toEqual(new Set(["1", "2", "3"]));
    });

    it("parses exclude_ids from search params", () => {
      const options = createDefaultOptions({ exclude_ids: "4,5" });
      const { result } = renderHook(() => useMetricValues(options), {
        wrapper: createWrapper(),
      });

      const excludeFilter = result.current.initialFilters.find(
        (f: any) => f.type === "exclude",
      );
      expect(excludeFilter).toBeDefined();
      expect(excludeFilter.ids).toEqual(new Set(["4", "5"]));
    });

    it("does not create id filters when params are absent", () => {
      const options = createDefaultOptions();
      const { result } = renderHook(() => useMetricValues(options), {
        wrapper: createWrapper(),
      });

      expect(
        result.current.initialFilters.filter((f: any) => f.type === "isolate"),
      ).toHaveLength(0);
      expect(
        result.current.initialFilters.filter((f: any) => f.type === "exclude"),
      ).toHaveLength(0);
    });
  });

  describe("onFiltersChange handler", () => {
    it("serializes facet filters into search params", () => {
      const options = createDefaultOptions();
      const { result } = renderHook(() => useMetricValues(options), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handlers.onFiltersChange([
          {
            type: "facet",
            id: "1",
            facetKey: "model",
            values: ["cesm2", "gfdl"],
          },
          {
            type: "facet",
            id: "2",
            facetKey: "experiment",
            values: ["historical"],
          },
        ]);
      });

      expect(options.navigate).toHaveBeenCalledWith(
        expect.objectContaining({
          search: expect.objectContaining({
            model: "cesm2,gfdl",
            experiment: "historical",
            offset: 0,
          }),
        }),
      );
    });

    it("includes isolate_ids in search params", () => {
      const options = createDefaultOptions();
      const { result } = renderHook(() => useMetricValues(options), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handlers.onFiltersChange([
          { type: "isolate", id: "1", ids: new Set(["10", "20"]) },
        ]);
      });

      expect(options.navigate).toHaveBeenCalledWith(
        expect.objectContaining({
          search: expect.objectContaining({
            isolate_ids: "10,20",
          }),
        }),
      );
    });

    it("includes exclude_ids in search params", () => {
      const options = createDefaultOptions();
      const { result } = renderHook(() => useMetricValues(options), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handlers.onFiltersChange([
          { type: "exclude", id: "1", ids: new Set(["30"]) },
        ]);
      });

      expect(options.navigate).toHaveBeenCalledWith(
        expect.objectContaining({
          search: expect.objectContaining({
            exclude_ids: "30",
          }),
        }),
      );
    });

    it("preserves detect_outliers and include_unverified across filter changes", () => {
      const options = createDefaultOptions({
        detect_outliers: "off",
        include_unverified: "true",
      });
      const { result } = renderHook(() => useMetricValues(options), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handlers.onFiltersChange([]);
      });

      expect(options.navigate).toHaveBeenCalledWith(
        expect.objectContaining({
          search: expect.objectContaining({
            detect_outliers: "off",
            include_unverified: "true",
          }),
        }),
      );
    });
  });

  describe("CSV download", () => {
    it("calls fetchDownload with format=csv and all search params", async () => {
      const options = createDefaultOptions({ model: "cesm2", offset: 50 });
      const { result } = renderHook(() => useMetricValues(options), {
        wrapper: createWrapper(),
      });

      // Mock URL/DOM APIs for download
      const createObjectURL = vi.fn().mockReturnValue("blob:url");
      const revokeObjectURL = vi.fn();
      Object.defineProperty(window, "URL", {
        value: { createObjectURL, revokeObjectURL },
        writable: true,
      });

      const mockClick = vi.fn();
      vi.spyOn(document, "createElement").mockReturnValue({
        set href(_: string) {},
        set download(_: string) {},
        click: mockClick,
      } as any);

      await act(async () => {
        await result.current.handlers.onDownload();
      });

      expect(options.fetchDownload).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            format: "csv",
            value_type: "scalar",
            model: "cesm2",
          }),
        }),
      );
    });
  });
});
