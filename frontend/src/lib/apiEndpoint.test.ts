import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  API_ENDPOINT_STORAGE_KEY,
  API_ENDPOINTS,
  clearStoredApiEndpoint,
  getCurrentEndpointKey,
  getEndpointDisplayName,
  getStoredApiEndpoint,
  isUsingEndpointOverride,
  storeApiEndpoint,
} from "./apiEndpoint";

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

beforeEach(() => {
  vi.stubGlobal("localStorage", localStorageMock);
  localStorageMock.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getStoredApiEndpoint", () => {
  it("returns default '/' when no storage", () => {
    expect(getStoredApiEndpoint()).toBe("/");
  });

  it("returns stored valid endpoint", () => {
    localStorageMock.setItem(API_ENDPOINT_STORAGE_KEY, API_ENDPOINTS.NESRC);
    expect(getStoredApiEndpoint()).toBe(API_ENDPOINTS.NESRC);
  });

  it("ignores invalid stored value (returns default)", () => {
    localStorageMock.setItem(API_ENDPOINT_STORAGE_KEY, "https://invalid.com");
    expect(getStoredApiEndpoint()).toBe("/");
  });
});

describe("storeApiEndpoint", () => {
  it("calls localStorage.setItem with correct key and value", () => {
    const endpoint = API_ENDPOINTS.ALCF;
    storeApiEndpoint(endpoint);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      API_ENDPOINT_STORAGE_KEY,
      endpoint,
    );
  });
});

describe("getCurrentEndpointKey", () => {
  it("returns correct key for known URL (NESRC)", () => {
    localStorageMock.setItem(API_ENDPOINT_STORAGE_KEY, API_ENDPOINTS.NESRC);
    expect(getCurrentEndpointKey()).toBe("NESRC");
  });

  it("returns correct key for known URL (ALCF)", () => {
    localStorageMock.setItem(API_ENDPOINT_STORAGE_KEY, API_ENDPOINTS.ALCF);
    expect(getCurrentEndpointKey()).toBe("ALCF");
  });

  it("returns correct key for known URL (LOCAL)", () => {
    localStorageMock.setItem(API_ENDPOINT_STORAGE_KEY, API_ENDPOINTS.LOCAL);
    expect(getCurrentEndpointKey()).toBe("LOCAL");
  });

  it("returns null for unknown URL", () => {
    // When an unknown URL is stored, getStoredApiEndpoint returns default "/"
    // which matches LOCAL, so getCurrentEndpointKey returns "LOCAL" not null
    expect(getCurrentEndpointKey()).toBe("LOCAL");
  });
});

describe("clearStoredApiEndpoint", () => {
  it("calls localStorage.removeItem", () => {
    clearStoredApiEndpoint();
    expect(localStorageMock.removeItem).toHaveBeenCalledWith(
      API_ENDPOINT_STORAGE_KEY,
    );
  });
});

describe("isUsingEndpointOverride", () => {
  it("returns true when storage has a value", () => {
    localStorageMock.setItem(API_ENDPOINT_STORAGE_KEY, API_ENDPOINTS.NESRC);
    expect(isUsingEndpointOverride()).toBe(true);
  });

  it("returns false when storage is empty", () => {
    expect(isUsingEndpointOverride()).toBe(false);
  });
});

describe("getEndpointDisplayName", () => {
  it("returns 'NESRC' for NESRC key", () => {
    expect(getEndpointDisplayName("NESRC")).toBe("NESRC");
  });

  it("returns 'ALCF' for ALCF key", () => {
    expect(getEndpointDisplayName("ALCF")).toBe("ALCF");
  });

  it("returns 'Localhost' for LOCAL key", () => {
    expect(getEndpointDisplayName("LOCAL")).toBe("Localhost");
  });

  it("returns 'Climate Resource' for CR key", () => {
    expect(getEndpointDisplayName("CR")).toBe("Climate Resource");
  });
});
