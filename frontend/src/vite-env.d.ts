/// <reference types="vite/client" />
/// <reference types="mdx" />

/** Version of the frontend bundle, injected at build time from package.json. */
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  /** Share of page loads traced by Sentry, from 0 to 1, read at build time. */
  readonly VITE_SENTRY_TRACES_SAMPLE_RATE?: string;
}
