import * as Sentry from "@sentry/react";

Sentry.init({
  // This isn't real sensitive since it's a public DSN, but don't commit your real one!
  dsn: import.meta.env.PROD
    ? "https://4d5d10b87919476ae6b23d5a613c413a@o4510086266486785.ingest.de.sentry.io/4510086733496401"
    : "",
  sendDefaultPii: true,
  integrations: [],
});
