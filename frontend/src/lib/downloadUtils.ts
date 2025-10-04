/**
 * Download utilities for handling file downloads in the browser
 */

/**
 * Download text content as a file
 * @param content - Text content to download
 * @param filename - Name of the file to save
 * @param mimeType - MIME type of the content (default: "text/plain")
 */
export function downloadTextFile(
  content: string,
  filename: string,
  mimeType = "text/plain",
): void {
  const blob = new Blob([content], { type: mimeType });
  downloadBlob(blob, filename);
}

/**
 * Download a blob as a file
 * @param blob - Blob to download
 * @param filename - Name of the file to save
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Download JSON data as a formatted JSON file
 * @param data - Data to serialize as JSON
 * @param filename - Name of the file to save
 */
export function downloadJson(data: unknown, filename: string): void {
  const jsonString = JSON.stringify(data, null, 2);
  downloadTextFile(jsonString, filename, "application/json");
}
