import { defineConfig, defaultPlugins } from "@hey-api/openapi-ts";

export default defineConfig({
  input: "./openapi.json",
  output: "src/client",
  plugins: [
    ...defaultPlugins,
    "@hey-api/client-fetch",
    "@hey-api/schemas",
    "@tanstack/react-query",
  ],
});
