// Available API endpoints
export const API_ENDPOINTS = {
  NESRC: "https://api.climate-ref.org",
  ALCF: "https://api-alcf.climate-ref.org",
  CR: "https://api-cr.climate-ref.org",
  STAGING: "https://staging.climate-ref.org",
  LOCAL: "/",
} as const;

export type ApiEndpointKey = keyof typeof API_ENDPOINTS;

// Local storage key
export const API_ENDPOINT_STORAGE_KEY = "climate-ref-api-endpoint";

/**
 * The endpoint this deployment of the dashboard uses unless the visitor picks another
 */
export function getDefaultApiEndpoint(): string {
  return import.meta.env.VITE_BASE_URL ?? "/";
}

/**
 * Get the stored API endpoint from local storage
 * Falls back to VITE_BASE_URL environment variable if no selection exists
 */
export function getStoredApiEndpoint(): string {
  const defaultEndpoint = getDefaultApiEndpoint();

  if (typeof window === "undefined") {
    // Server-side rendering fallback
    return defaultEndpoint;
  }

  try {
    const stored = localStorage.getItem(API_ENDPOINT_STORAGE_KEY);
    if (stored && Object.values(API_ENDPOINTS).includes(stored as any)) {
      return stored;
    }
  } catch (error) {
    console.warn("Failed to read API endpoint from localStorage:", error);
  }

  // Fallback to environment variable
  return defaultEndpoint;
}

/**
 * Store the selected API endpoint in local storage
 */
export function storeApiEndpoint(endpoint: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(API_ENDPOINT_STORAGE_KEY, endpoint);
  } catch (error) {
    console.warn("Failed to store API endpoint in localStorage:", error);
  }
}

/**
 * Get the current API endpoint key based on the stored URL
 */
export function getCurrentEndpointKey(): ApiEndpointKey | null {
  const currentEndpoint = getStoredApiEndpoint();

  for (const [key, value] of Object.entries(API_ENDPOINTS)) {
    if (value === currentEndpoint) {
      return key as ApiEndpointKey;
    }
  }

  return null;
}
/**
 * Clear the stored API endpoint from local storage
 */
export function clearStoredApiEndpoint(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.removeItem(API_ENDPOINT_STORAGE_KEY);
  } catch (error) {
    console.warn("Failed to clear API endpoint from localStorage:", error);
  }
}

/**
 * Check if the current endpoint is different from the default
 */
export function isUsingEndpointOverride(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return localStorage.getItem(API_ENDPOINT_STORAGE_KEY) !== null;
  } catch (error) {
    console.warn("Failed to store API endpoint in localStorage:", error);
  }
  return false;
}

/**
 * Get a human-readable name for the endpoint
 */
export function getEndpointDisplayName(key: ApiEndpointKey): string {
  switch (key) {
    case "NESRC":
      return "NESRC";
    case "ALCF":
      return "ALCF";
    case "LOCAL":
      return "Localhost";
    case "CR":
      return "Climate Resource";
    case "STAGING":
      return "Staging";
    default:
      return "Unknown";
  }
}

/**
 * Whether the settings offer an endpoint
 *
 * Staging is only offered on the staging deployment of the dashboard,
 * or while it is the endpoint in use, so the list never hides the current choice.
 */
export function isEndpointOffered(
  key: ApiEndpointKey,
  {
    stagingDashboard,
    current,
  }: { stagingDashboard: boolean; current: boolean },
): boolean {
  return key !== "STAGING" || stagingDashboard || current;
}
