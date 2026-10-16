import type { Client } from "@/client/client";

/** The message the API put in an error body, such as `{detail: "Not found"}` or a list of validation errors. */
function bodyMessage(body: unknown): string | null {
  if (typeof body === "string" && body !== "") {
    return body;
  }
  if (typeof body === "object" && body !== null && "detail" in body) {
    const { detail } = body;
    if (typeof detail === "string") {
      return detail;
    }
    if (Array.isArray(detail)) {
      const messages = detail
        .map((item) => (typeof item?.msg === "string" ? item.msg : null))
        .filter((msg) => msg !== null);
      if (messages.length > 0) {
        return messages.join("; ");
      }
    }
  }
  return null;
}

/** An API response with an error status. */
export class ApiError extends Error {
  readonly status: number;
  /** The parsed response body */
  readonly body: unknown;
  /** The body's `detail`, where FastAPI puts the reason, kept for code that reads it */
  readonly detail: unknown;

  constructor(status: number, body: unknown) {
    super(bodyMessage(body) ?? `Request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
    this.detail =
      typeof body === "object" && body !== null && "detail" in body
        ? body.detail
        : undefined;
  }
}

/**
 * Make the client throw an `ApiError` for a response with an error status
 *
 * The generated client otherwise throws the bare parsed body, which loses the status.
 * Errors without a response, such as a network failure, are left as they are.
 */
export function installApiErrors(client: Client) {
  client.interceptors.error.use((error, response) =>
    response && !response.ok ? new ApiError(response.status, error) : error,
  );
}

export function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

/** Retry a failed query up to three times, React Query's default, but never a 404, which a retry will not fix. */
export function retryUnlessNotFound(failureCount: number, error: unknown) {
  return !isNotFound(error) && failureCount < 3;
}

/** A readable message for an error from an API call. */
export function apiErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return bodyMessage(error) ?? "Unknown error";
}
