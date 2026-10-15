import * as Sentry from "@sentry/react";

Sentry.init({
  // This isn't real sensitive since it's a public DSN, but don't commit your real one!
  dsn: import.meta.env.PROD
    ? "https://11fe89ec0b64497ccd1e78e4bece59d5@o495046.ingest.us.sentry.io/4510072293425152"
    : "",
  sendDefaultPii: false,
  integrations: [],
});
