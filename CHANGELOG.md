## v0.2.3 (2026-04-10)

### Bug Fixes

- Fixed high-priority security vulnerabilities: replaced raw SQL interpolation in diagnostics facets endpoint with safe ORM queries, disabled PII collection in Sentry, and restricted CORS to GET-only methods for the read-only API. (#28)


## v0.2.2 (2026-04-09)

### Trivial Changes

- Updated GitHub Actions to Node.js 24 compatible versions ahead of the Node.js 20 deprecation. (#27)


## v0.2.1 (2026-04-09)

### Bug Fixes

- Allowed the application to start without a `ref.toml` file by falling back to environment defaults. (#26)


## v0.2.0 (2026-04-08)

### Features

- Added an "Explorer" tab to the diagnostic detail view that displays interactive explorer visualizations from the associated CMIP7 AFT collection. (#19)
- Added server-side pagination to the series and scalar metric value tables. Requests now return pages of 50 results by default (configurable up to 500), preventing timeouts on diagnostics with hundreds of timeseries. Pagination controls allow navigating between pages and selecting page size. (#23)
- Added region filter dropdown to annual cycle explorer cards, allowing users to filter time series charts by geographic region. (#25)

### Improvements

- Added BACKEND_CORS_ORIGIN_REGEX environment variable to support regex patterns for CORS origins (#21)
- Updated backend and frontend dependencies to their latest compatible versions. (#22)
