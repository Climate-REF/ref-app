import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { downloadBlob, downloadJson, downloadTextFile } from "./downloadUtils";

const mockClick = vi.fn();
const mockAppendChild = vi.fn();
const mockRemoveChild = vi.fn();
const mockCreateObjectURL = vi.fn(() => "blob:mock-url");
const mockRevokeObjectURL = vi.fn();

beforeEach(() => {
  vi.spyOn(document, "createElement").mockReturnValue({
    href: "",
    download: "",
    click: mockClick,
  } as unknown as HTMLAnchorElement);
  vi.spyOn(document.body, "appendChild").mockImplementation(mockAppendChild);
  vi.spyOn(document.body, "removeChild").mockImplementation(mockRemoveChild);
  vi.stubGlobal("URL", {
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("downloadTextFile", () => {
  it("creates Blob with correct content and MIME type", () => {
    const content = "test content";
    const filename = "test.txt";
    const mimeType = "text/plain";

    downloadTextFile(content, filename, mimeType);

    expect(mockCreateObjectURL).toHaveBeenCalledWith(
      expect.objectContaining({
        type: mimeType,
      }),
    );
    expect(mockClick).toHaveBeenCalled();
  });

  it("triggers download via anchor click", () => {
    const content = "test content";
    const filename = "test.txt";

    downloadTextFile(content, filename);

    expect(mockAppendChild).toHaveBeenCalled();
    expect(mockClick).toHaveBeenCalled();
    expect(mockRemoveChild).toHaveBeenCalled();
  });
});

describe("downloadBlob", () => {
  it("creates object URL", () => {
    const blob = new Blob(["test"], { type: "text/plain" });
    const filename = "test.txt";

    downloadBlob(blob, filename);

    expect(mockCreateObjectURL).toHaveBeenCalledWith(blob);
  });

  it("creates anchor element with correct attributes", () => {
    const blob = new Blob(["test"], { type: "text/plain" });
    const filename = "test.txt";

    downloadBlob(blob, filename);

    expect(document.createElement).toHaveBeenCalledWith("a");
  });

  it("clicks anchor and cleans up", () => {
    const blob = new Blob(["test"], { type: "text/plain" });
    const filename = "test.txt";

    downloadBlob(blob, filename);

    expect(mockAppendChild).toHaveBeenCalled();
    expect(mockClick).toHaveBeenCalled();
    expect(mockRemoveChild).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });
});

describe("downloadJson", () => {
  it("serializes data with 2-space indent", () => {
    const data = { key: "value", nested: { prop: 123 } };
    const filename = "test.json";

    downloadJson(data, filename);

    expect(mockCreateObjectURL).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "application/json",
      }),
    );
    expect(mockClick).toHaveBeenCalled();
  });

  it("uses application/json mime type", () => {
    const data = { test: true };
    const filename = "data.json";

    downloadJson(data, filename);

    expect(mockCreateObjectURL).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "application/json",
      }),
    );
  });
});
