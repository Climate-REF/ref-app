import path from "node:path";
import type { UserConfig } from "@hey-api/openapi-ts";

// Paths are anchored to this file because the generator runs from an isolated directory.
export default {
  input: path.join(import.meta.dirname, "openapi.json"),
  output: path.join(import.meta.dirname, "src/client"),
  plugins: [
    "@hey-api/typescript",
    "@hey-api/sdk",
    "@hey-api/client-fetch",
    "@tanstack/react-query",
  ],
} satisfies UserConfig;
