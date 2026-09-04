## v0.7.1 (2026-09-04)

### Improvements

- Execution and execution group counts on a diagnostic page now cover the same runs as the values below them.
  The version itself is shown alongside the counts. (#93)
- Coloured the concentration driven and emissions driven historical runs apart on the explorer charts.
  Historical is always blue and esm-hist always orange,
  and Taylor diagrams no longer merge the two runs of one model. (#94)

### Bug Fixes

- Diagnostic pages now list each grouping once.
  A diagnostic that declares one data requirement per variable was repeating the same grouping dozens of times. (#93)
- Fixed page view analytics on the container deployments.
  The backend now proxies `/log/script.js` and `/log/api/event` through to plausible.io,
  so the tracker no longer hits the static file mount and gets a 405.
  The tracker also posts to a relative path, so production stops reporting into the staging site. (#95)

### Documentation

- Links the diagnostics catalog description to the Zenodo record, the Rapid Evaluation Framework GMD paper and the discussion board for proposing new diagnostics.
  Updates the Hoffman et al. citations from the EGUsphere preprint to the published GMD paper. (#96)


## v0.7.0 (2026-09-03)

### Improvements

- Reported resource usage in core hours instead of CPU time formatted as days.
  Reported the peak memory of a diagnostic as a min and max range, which shows how widely executions of the same diagnostic vary. (#91)

### Breaking Changes

- Removed the summed wall time from the resource usage and diagnostic overviews. Executions run in parallel, so the sum was not comparable to the elapsed time of a run. (#91)


## v0.6.3 (2026-09-03)

### Features

- Cycles the theme through light, dark and system rather than flipping between light and dark.
  Once a theme was picked there was no way back to following the operating system.
  The dashboard also reports how many execution groups ran against CMIP6 and how many against CMIP7,
  and the datasets table gains experiment, source and variable columns. (#89)

### Improvements

- Reworks the Data Explorer header, which put roughly 600px of prose above the first result.
  The title, the catalog link and the feedback link now sit above the card rather than inside it,
  and the help text keeps only the points the theme tabs do not already make.
  The datasets and executions pages move their headers out of the first card to match.
  The plain language toggle moves onto the MIP era bar, because both controls scope the same results. (#89)

### Bug Fixes

- Reloads the page when a chunk fails to load, so a tab left open across a deployment recovers instead of showing an error. (#88)
- Renders dataset types as `cmip7` rather than `SourceDatasetType.CMIP7`.
  `SourceDatasetType` is a plain enum, so `str()` on it leaked the Python repr into every dataset response.
  This also fills in the More Info column for CMIP6 rows on the datasets page,
  because the lookup that builds the link tested for `cmip6` in a string that never contained it.
  Groups the digits in the dashboard counts, which ran together as `954217 scalars`,
  and spaces the labels and values in the version footer. (#89)


## v0.6.2 (2026-09-02)

### Features

- Adds a staging mode, driven by the `ENVIRONMENT` setting the `/api/v1/utils/about` endpoint now reports.
  A staging deployment carries a banner naming it as one, and drops the sample-size floor so a chart is
  drawn even when only one or two models have results. (#87)

### Improvements

- Drops the model-family grouping behind the sparse-sample warning.
  The warning now counts distinct `source_id` values, so a chart drawn from fewer than ten models is
  flagged whatever centres they came from. (#87)

### Bug Fixes

- Applies the MIP era selection to the metric values query rather than only to the charts drawn from it.
  Outlier detection pooled CMIP6 and CMIP7 into one IQR group, so the era a reader had selected did not
  decide which values were flagged. Pagination counted both eras as well.
  The scalar and series value tabs now carry the era selector too, so a table shows one era at a time. (#87)


## v0.6.1 (2026-09-02)

### Features

- Adds a `/api/v1/utils/about` endpoint exposing the ref-app version, the climate-ref version and the time the
  results were last updated.
  The footer now shows these alongside the version of the frontend bundle. (#86)


## v0.6.0 (2026-09-02)

### Features

- Added a CMIP6 / CMIP7 era bar to every results page, coloured with the CMIP brand palette.
  The last picked era is remembered when moving between pages.
  The diagnostics catalog now counts only the selected era's execution groups. (#85)

### Bug Fixes

- The figure gallery and execution groups tab now show only the selected MIP era. (#85)


## v0.5.1 (2026-09-02)

### Improvements

- Renamed the wall time roll-up on the resource usage page to make clear it is a sum across executions.
  Executions run in parallel, so the sum can be larger than the elapsed time of the run. (#83)

### Trivial Changes

- Fixes the Biome pre-commit hooks, which passed staged filenames to `bash -lc` rather than to Biome and so checked the whole frontend tree on every commit. The hooks now run the Biome and TypeScript versions pinned in `frontend/package.json`. (#84)


## v0.5.0 (2026-09-02)

### Features

- Adds CMIP7 alongside CMIP6.
  Both eras are listed, filtered and served through the same endpoints.
  The executions endpoint takes a new `mip_era` filter.

  Results from the two eras are never drawn on the same chart,
  because the ensembles are not directly comparable.
  Every model value now reports the era of the datasets its execution ran against,
  so charts split correctly even for the diagnostics that record no era of their own.
  Observational values carry no era, so they appear on both charts as the shared baseline. (#70)
- Adds a CMIP6/CMIP7 selector to the top of both explorer pages.
  Each page now shows one era of chart data at a time,
  rather than stacking both inside every card.

  The choice is held in the URL as `mip_era`, so a shared link keeps it.
  A card with nothing for the selected era says so instead of rendering empty.
  Values that record no era are always shown, labelled as such, since no era describes them.
  Figure galleries are unaffected, because they hold output images rather than values with an era.
  Pages that show a single chart, such as a diagnostic's scalar and series tabs,
  still label and stack their eras in place. (#71)
- Added the wall time, CPU time and peak memory recorded for each execution to the execution pages and tables.

  - Each diagnostic page now shows a roll-up of these values across its executions.
  - A new resource usage page under Executions lists the roll-up for every diagnostic.

  (#80)

### Improvements

- Gates charts built from model data on how many models contributed to them.

  - A chart drawn from fewer than four models is no longer shown, because the spread is not meaningful.
  - A chart drawn from fewer than ten model families is still shown,
    with a warning that the sample is small and correlated.
    Models in a family share code and biases,
    so ACCESS-CM2 and ACCESS-ESM1-5 are not two independent lines of evidence.
  - Data that is not dimensioned by model, such as a per-region diagnostic, is not gated at all.

  (#70)
- Updated the logo and branding to the new Climate-REF marks, including the navbar wordmark and the favicons. (#73)
- Improved the executions list and statistics.

  - Execution groups from superseded diagnostic versions are no longer shown or counted.
  - The statistics now report running and not-yet-run groups separately from failed ones.

  (#76)

### Breaking Changes

- Renames the `CMIP6DatasetMetadata` API schema to `CMIPDatasetMetadata`,
  since it now describes CMIP7 datasets as well.
  Consumers of the generated client should update the type name. (#70)

### Trivial Changes

- Updates the backend to Python 3.14, including the uv base image. (#62)
- Updates TypeScript to v7, dropping the removed `baseUrl` option and referencing the mdx types explicitly. (#68)
- Updates Vite to v8, switching the katex chunk to the `manualChunks` function form that rolldown requires. (#69)
- Renames the era handling onto `mip_era`, which is the WCRP term
  and a required attribute in the CMIP7 controlled vocabulary. (#71)
- Fixed `make generate-client`, which crashed under TypeScript 7. (#76)
- Stopped exporting page components from route files so the router can code-split them. (#80)
- Removes 14 unreferenced frontend files, the unused `globals` and `@testing-library/user-event` dev dependencies, and the commented-out example provider scaffolding in the backend. (#81)


## v0.4.2 (2026-08-14)

### Improvements

- Builds the dataset listing on `climate_ref`'s shared `select_datasets` query rather than hand-rolled polymorphic filtering.
  This has a few consequences:

  - Only the latest version of each dataset is listed, so superseded versions no longer appear as duplicates.
  - Fetching a dataset by slug returns the latest version instead of failing when several versions share a slug.
  - An unknown `dataset_type` or an unknown facet key now returns a 400 rather than being silently ignored.

  (#49)

### Bug Fixes

- Resolves execution artifact paths through `Reader.artifacts` instead of joining the results root by hand.
  The reader guards containment, so a bad `output_fragment` or filename can no longer escape the results directory.
  Requests for such a path now return a 404. (#49)
- Gives each request its own database session, so a request no longer leaves a connection idle in a transaction.
  The session dependency handed out `Database.session`, which is long lived and shared process-wide, and never closed it.
  This now uses `Database.session_scope` from climate-ref 0.17.2, which is the minimum version as a result.
  The `Database` is also cached per url, rather than being rebuilt on each request. (#51)

### Trivial Changes

- Reworked a batch of internal cleanups. The test suite no longer reads the shared user cache directory, so a stale file there cannot fail every test. The duplicated metric-value endpoint logic now lives in one helper, the diagnostic metadata cache is keyed by path rather than held on a class, and `ref_backend.models` is split into a package. Coverage is now reported for the frontend and the backend gate is raised to 90 percent. (#47)
- Bumped the locked frontend and backend dependencies to clear the open security advisories. (#50)


## v0.4.1 (2026-08-13)

### Improvements

- Memoizes the ensemble chart statistics pipeline, drops the window-level mousemove subscription, and replaces linear series alignment with map lookups. (#45)
- Updated climate-ref to 0.17.0. (#46)

### Bug Fixes

- Returns 404/400 for malformed ids and facet filters instead of a 500, and stops leaking internal error detail from the AFT routes. (#44)

### Trivial Changes

- Removed the unused pre-Reader metric-value helpers and their tests. (#42)
- Adds direct tests for the reader-values CSV path, file streaming, and config validation. (#43)


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
