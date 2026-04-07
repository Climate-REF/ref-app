import path from "node:path";
import mdx from "@mdx-js/rollup";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig, type ProxyOptions } from "vite";

const proxyDataUrl = process.env.VITE_PROXY_DATA_URL;

const proxyConfig: Record<string, ProxyOptions> = proxyDataUrl
  ? {
      "/api/v1/explorer": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
      "/api/v1/cmip7-aft-diagnostics": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
      "/api": {
        target: proxyDataUrl,
        changeOrigin: true,
        secure: false,
      },
    }
  : {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
    };

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  build: {
    sourcemap: true, // Source map generation must be turned on
    rollupOptions: {
      output: {
        manualChunks: {
          katex: ["katex"],
        },
      },
    },
  },
  server: {
    proxy: proxyConfig,
  },
  plugins: [
    mdx(/* jsxImportSource: …, otherOptions… */),
    TanStackRouterVite({ target: "react", autoCodeSplitting: true }),
    react({
      jsxImportSource:
        mode === "development"
          ? "@welldone-software/why-did-you-render"
          : "react",
    }),
    tailwindcss(),
    sentryVitePlugin({
      authToken: process.env.SENTRY_AUTH_TOKEN,
      org: "cmip-ipo",
      project: "ref-app-backend",
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
