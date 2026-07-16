## v0.4.0 (2026-07-16)

### Features

- Series charts now distinguish model and reference data using the shared metric-value contract's role field instead of a dataset naming convention, deduplicate repeated reference series, and label axes with each series' own units. Series that cover different time or index ranges are now aligned by index value rather than by position, so they no longer smear together. (#32)

### Bug Fixes

- The metric-value facets no longer include the internal `kind` dimension, which is surfaced as a dedicated field on each value rather than a filterable facet. (#41)

### Breaking Changes

- The backend now requires Python 3.12 or newer, following the climate-ref dependency update that powers the shared metric-value contract. (#32)

### Trivial Changes

- Corrected the pre-commit TypeScript check to use project-reference build mode (`tsc -b`), so build-breaking type errors are caught before they reach CI. (#33)
- Added Renovate to automatically keep the frontend and backend dependencies up to date, wired into vulnerability alerts with a 3-day release-age standdown as a supply-chain safeguard. (#34)
- The backend now serves metric values through the shared `climate_ref.results` read layer instead of its own bespoke database queries. API responses are unchanged. (#39)
- The backend now installs `climate-ref` from PyPI instead of a git tag, because v0.16 has been published there. (#40)
- Refreshed the backend integration test fixture with a fresh full-provider solve (adds PMP outputs) and trimmed it for size. (#41)


## v0.3.0 (2026-04-13)

### Improvements

- Upgraded `@hey-api/openapi-ts` to v0.95.0 and removed the standalone `@hey-api/client-fetch` dependency, which is now bundled with the code generator. (#24)

### Breaking Changes

- The default `REF_CONFIGURATION` path in the image changed from `/app/.ref` to `/ref`,
  to align with the `climate-ref` worker image. Deployments that relied on the default must
  remount their config/state volume at `/ref`, or set `REF_CONFIGURATION` explicitly.

  Added a `REF_READ_ONLY_DATABASE` setting so the API can run against a read-only `/ref` volume,
  using `climate-ref` 0.13.1's `Database.from_config(read_only=True)` and `Database.migration_status` helpers.
  Bumped `vite` to `>=7.3.2` for a security fix and refreshed the Python lockfile. (#30)


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
