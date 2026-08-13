import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/test/**",
        "src/client/**",
        "src/routeTree.gen.ts",
        "src/components/ui/**",
        "*.config.ts",
      ],
      thresholds: {
        statements: 13,
        branches: 15,
        functions: 11,
        lines: 14,
      },
    },
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
