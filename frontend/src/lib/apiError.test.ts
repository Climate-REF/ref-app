import { describe, expect, it, vi } from "vitest";
import { createClient } from "@/client/client";
import {
  ApiError,
  apiErrorMessage,
  installApiErrors,
  retryUnlessNotFound,
} from "./apiError";

describe("apiErrorMessage", () => {
  it("uses the message of a thrown Error", () => {
    expect(apiErrorMessage(new TypeError("Failed to fetch"))).toBe(
      "Failed to fetch",
    );
  });

  it("uses the detail of an API error body", () => {
    expect(apiErrorMessage({ detail: "Log file not found" })).toBe(
      "Log file not found",
    );
  });

  it("joins the messages of validation errors", () => {
    expect(
      apiErrorMessage({
        detail: [{ msg: "Input should be valid" }, { msg: "Field required" }],
      }),
    ).toBe("Input should be valid; Field required");
  });

  it("uses a plain text body as is", () => {
    expect(apiErrorMessage("Internal Server Error")).toBe(
      "Internal Server Error",
    );
  });

  it.each([null, undefined, "", {}, { detail: [] }, { detail: 42 }])(
    "falls back for %j",
    (error) => {
      expect(apiErrorMessage(error)).toBe("Unknown error");
    },
  );
});

describe("ApiError", () => {
  it("reads its message and detail from the body", () => {
    const error = new ApiError(404, { detail: "Log file not found" });
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe("Log file not found");
    expect(error.detail).toBe("Log file not found");
    expect(apiErrorMessage(error)).toBe("Log file not found");
  });

  it("falls back to the status for a body without a message", () => {
    expect(new ApiError(502, {}).message).toBe(
      "Request failed with status 502",
    );
  });
});

describe("retryUnlessNotFound", () => {
  it("never retries a 404", () => {
    expect(retryUnlessNotFound(0, new ApiError(404, {}))).toBe(false);
  });

  it.each([new ApiError(500, {}), new TypeError("Failed to fetch")])(
    "retries %s up to three times",
    (error) => {
      expect(retryUnlessNotFound(0, error)).toBe(true);
      expect(retryUnlessNotFound(2, error)).toBe(true);
      expect(retryUnlessNotFound(3, error)).toBe(false);
    },
  );
});

describe("installApiErrors", () => {
  const clientReturning = (response: () => Promise<Response>) => {
    const client = createClient({
      baseUrl: "http://api.test",
      fetch: vi.fn(response),
    });
    installApiErrors(client);
    return client;
  };

  it("throws an ApiError with the status of an error response", async () => {
    const client = clientReturning(async () =>
      Response.json({ detail: "Execution not found" }, { status: 404 }),
    );
    const request = client.get({ url: "/executions/1", throwOnError: true });

    await expect(request).rejects.toMatchObject({
      name: "ApiError",
      status: 404,
      message: "Execution not found",
    });
  });

  it("leaves a network failure as it is", async () => {
    const failure = new TypeError("Failed to fetch");
    const client = clientReturning(() => Promise.reject(failure));
    const request = client.get({ url: "/executions/1", throwOnError: true });

    await expect(request).rejects.toBe(failure);
  });
});
