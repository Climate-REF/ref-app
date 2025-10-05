import { useEffect, useState } from "react";
import {
  API_ENDPOINTS,
  type ApiEndpointKey,
  clearStoredApiEndpoint,
  getCurrentEndpointKey,
  getEndpointDisplayName,
  getStoredApiEndpoint,
  isUsingEndpointOverride,
  storeApiEndpoint,
} from "@/lib/apiEndpoint";

export function useApiEndpoint() {
  const [currentEndpoint, setCurrentEndpoint] = useState<string>("");
  const [currentKey, setCurrentKey] = useState<ApiEndpointKey | null>(null);

  // Initialize the endpoint from storage
  useEffect(() => {
    const endpoint = getStoredApiEndpoint();
    const key = getCurrentEndpointKey();
    setCurrentEndpoint(endpoint);
    setCurrentKey(key);
  }, []);

  /**
   * Change the API endpoint and store it in local storage
   */
  const changeEndpoint = (key: ApiEndpointKey) => {
    const newEndpoint = API_ENDPOINTS[key];
    storeApiEndpoint(newEndpoint);
    setCurrentEndpoint(newEndpoint);
    setCurrentKey(key);

    // Reload the page to apply the new endpoint
    window.location.reload();
  };

  /**
   * Clear the API endpoint override and revert to default
   */
  const clearEndpoint = () => {
    clearStoredApiEndpoint();
    setCurrentEndpoint(import.meta.env.VITE_BASE_URL || API_ENDPOINTS.NESRC);
    setCurrentKey(null);

    // Reload the page to apply the default endpoint
    window.location.reload();
  };

  /**
   * Get all available endpoints with their display names
   */
  const getAvailableEndpoints = () => {
    return Object.entries(API_ENDPOINTS).map(([key, value]) => ({
      key: key as ApiEndpointKey,
      url: value,
      displayName: getEndpointDisplayName(key as ApiEndpointKey),
      isCurrent: value === currentEndpoint,
    }));
  };

  return {
    currentEndpoint,
    currentKey,
    changeEndpoint,
    clearEndpoint,
    getAvailableEndpoints,
    isUsingOverride: isUsingEndpointOverride(),
    getCurrentDisplayName: currentKey
      ? getEndpointDisplayName(currentKey)
      : "Unknown",
  };
}
