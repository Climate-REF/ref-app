import * as Sentry from "@sentry/react";

const DEFAULT_TRACES_SAMPLE_RATE = 0.1;

Sentry.init({
  // This isn't real sensitive since it's a public DSN, but don't commit your real one!
  dsn: import.meta.env.PROD
    ? "https://11fe89ec0b64497ccd1e78e4bece59d5@o495046.ingest.us.sentry.io/4510072293425152"
    : "",
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: false,
    httpBodies: [],
  },
  // The backend follows the browser's sampling decision, so this rate also sets how many API spans it records.
  tracesSampleRate: Number(
    import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ||
      DEFAULT_TRACES_SAMPLE_RATE,
  ),
  // Same-origin calls plus the hosted APIs listed in `lib/apiEndpoint.ts`.
  tracePropagationTargets: [
    /^\/api\//,
    /^https:\/\/[\w.-]*climate-ref\.org\/api\//,
  ],
  // The backend's OpenTelemetry spans join the trace through `traceparent`.
  propagateTraceparent: true,
  integrations: [],
});
