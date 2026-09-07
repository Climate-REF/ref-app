# Observability

What the REF App emits and where it lands.
The shape of this comes from the `copier-python-service` template, so it lines up with the other
Climate Resource services.
The cross-app picture lives in `docs/research/app-observability-baseline.md` in the
`infrastructure` repository.

## What ships

| Pillar  | Mechanism                                          | Status                      |
| ------- | -------------------------------------------------- | --------------------------- |
| Metrics | `/metrics` via `prometheus-fastapi-instrumentator` | Implemented                 |
| Logs    | JSON wide events on stdout, scraped by the cluster | Implemented                 |
| Errors  | Sentry, on once `SENTRY_DSN` is set                 | Implemented, off by default |
| Traces  | OpenTelemetry                                       | Not wired up                |

## Wide events

Every HTTP request produces one JSON log line on the `access` logger.
Fields:

| Field             | Meaning                                                       |
| ----------------- | ------------------------------------------------------------- |
| `event`           | Always `http_request`.                                        |
| `request_id`      | From `x-request-id`, or minted if absent.                     |
| `method`          | HTTP method.                                                  |
| `path`            | Request path.                                                 |
| `query`           | Query parameters.                                             |
| `status`          | Response status code.                                         |
| `duration_ms`     | Wall-clock request time.                                      |
| `response_bytes`  | Response body size.                                           |
| `client_ip`       | From `x-forwarded-for`, falling back to the socket peer.      |
| `user_agent`      | Request header.                                               |
| `referer`         | Request header.                                               |
| `sentry_trace_id` | Present when Sentry is configured, for cross-tool correlation. |
| `error_type`      | Exception class name, present only on an unhandled exception. |

Every log line also carries environment context: `service`, `version`, `commit`, `env` and
`instance_id`.

Every request logs at `info`, except an unhandled exception, which logs at `error`.
A successful hit on `/livez`, `/readyz` or `/metrics` logs at `debug`, so the probes do not
drown out real traffic.

`request_id` ties the pillars together.
The response carries it in `x-request-id`, the wide event carries it alongside `sentry_trace_id`,
and Sentry events carry it as the `request_id` tag.
Metrics are aggregates, so they link by `path` and `status` rather than by request.

## Log format

`LOG_FORMAT=json` is the default and is what the cluster expects.
Set `LOG_FORMAT=text` for local development to get a human-readable line
with the structured fields appended as `key=value` pairs.
`LOG_LEVEL` sets the root level and defaults to `INFO`.

climate-ref and its providers log through loguru.
`configure_logging` re-points loguru at the standard library, so those records land in the same
stream with the same formatter rather than going out unstructured.

## Health checks

`GET /livez` answers that the process is alive.
It never touches a dependency, so it cannot go down because a dependency did.

`GET /readyz` runs the checks on `app.state.readiness_checks` and returns `503` if any fail.
`build_app` registers one check, which proves the configured REF database still answers a query.
Register another by appending a zero-argument callable to that list.
A check signals trouble by returning a falsy value or by raising.
A check may be async, in which case what it returns is awaited.

## Deployment information

`GET /deploy/info` reports the version and the build stamps baked into the image:
`GIT_COMMIT`, `IMAGE_TAG` and `BUILD_TIME`.
These are the same values the wide events carry, so a log line can be traced back to an image.
It is an operator diagnostic and is left out of the schema.

`GET /api/v1/utils/about` covers the user-facing side: the app and REF versions, and how fresh
the results are.

## Metrics

Two standard names, read by the generic Application dashboard:

- `http_requests_total`, labelled by `method`, `path` and `status`.
- `http_request_duration_seconds`, a histogram labelled by `method` and `path`.

A counter or histogram made with `prometheus_client` shows up on `/metrics` on its own.

`/metrics`, `/livez`, `/readyz` and `/deploy/info` are all registered before the SPA static mount,
which otherwise answers every path.

## Sentry

Off until `SENTRY_DSN` is set, and skipped entirely when `ENVIRONMENT` is `local`.

## Gaps

- [ ] OpenTelemetry tracing, which the template ships but this app does not yet install.
- [ ] Pyroscope profiling, likewise.
- [ ] Readiness checks beyond the database, if the API grows another hard dependency.
- [ ] Service-specific alert rules and dashboards beyond the generic set.
