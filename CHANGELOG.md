## v0.9.2 (2026-10-26)

### Trivial Changes

- Gave the `ci-pass` CI job no token permissions. (#164)
- Fixed the `logger` field on backend JSON logs, which named Sentry instead of the calling module. (#165)
- Renovate now opens climate-ref update PRs as soon as a release is published. (#166)


## v0.9.1 (2026-10-26)

### Features

- The failures page can now show passing execution groups, and lists models without failures with an empty state saying how many of their groups passed. (#159)

### Improvements

- The `/models` endpoints now count execution groups the same way as the diagnostics endpoints, and the models list is about twice as fast on a large database. In the ensemble comparison a value with no `kind` now counts as a model value. (#156)
- Sped up the diagnostics listing by loading every diagnostic's provider and execution groups in a fixed number of queries. (#157)
- The diagnostic dots on the failures page now turn grey and gently swell while the counts for new filters load. (#161)

### Bug Fixes

- Loading more passing groups on the failures page no longer hides the groups already loaded when it fails, and a failure to load the model list is now reported with a retry. (#161)

### Trivial Changes

- Renovate now batches updates weekly and merges dev tooling, GitHub Actions and lockfile updates once CI passes. (#160)


## v0.9.0 (2026-10-24)

### Features

- Added a "failures" page to list failed executions. (#132)
- Added the commit the site was built from to the footer, linked to GitHub, and to `/utils/about` as `commit`. (#134)
- Added the `REF_MIGRATE_DATABASE` environment variable, which runs `ref db migrate` once when the container starts.
  A backup of a SQLite database is taken before any pending migrations are applied. (#144)
- * Added `/diagnostics/{provider}/{diagnostic}/values/facets` and `/executions/{group_id}/values/facets`, which return the facets of the metric values `/values` returns for the same filters.
  * Added a `with_facets` argument to `/values`. Set it to `false` to skip the facets.

  (#147)

### Improvements

- * `/{group_id}/logs` now accepts an optional `lines` argument that limits the returned log to the stated number of lines taken from the end of the log. (#132)
- * Added a model selection and some log parsing to the failures page. (#133)
- * Failures page now allows filtering by `failure_reason`, model and date range.
  * Upgraded to use climate-ref v0.19.0 and exposed `failure_reason` in the API.

  (#137)
- Added the `WEB_CONCURRENCY` environment variable to set the number of API workers, which defaults to 4. (#144)
- * Sped up the diagnostic, execution and metric value endpoints, most by five to ten times on a large database.
  * The values tables and explorer filters now load facets once per filter instead of with every page.

  (#147)
- Added request tracing from the dashboard through the API, and `/livez` and `/readyz` health probes. (#150)
- Added one structured log line per API request, with its route, status, duration and trace id, and made `LOG_LEVEL` apply to all API logs. (#153)

### Bug Fixes

- Client errors such as 404s from crawlers are now logged at info rather than error. A missing execution log is still logged as an error. (#131)
- * Execution groups whose latest execution is still running now show as running, and groups that have never run show as not run instead of failed. Their pages open instead of failing.
  * The executions list shows API errors instead of an empty list. Its filters wait until typing pauses, and "Clear All" also empties the inputs.
  * The datasets page no longer breaks on a malformed facet filter in the URL, and typing in the diagnostics search no longer adds a browser history entry per key.
  * Series charts: the tooltip compares values at the highlighted point, y-axis labels stay readable for large values in a small range, toggling a legend group works while a series is soloed, and reference series are visible in dark mode.
  * Explorer cards: "View chart values" and the CSV download use the card's region, MIP era and unverified setting, series cards download series values, and a configured filter default that does not exist falls back to the first option.
  * Execution value tabs keep their filters in the URL, and value tab links with numeric facet values no longer fail.
  * "Try Again" after an error retries the failed part instead of reloading the page, and navigating away from a page that failed shows the new page.
  * The Taylor diagram is readable in dark mode, and links in explorer descriptions are shown as links.
  * Log downloads are named after the execution group, the log view has a Debug filter, and the model page shows the actual error when loading fails.

  (#139)
- Backend errors reported to Sentry now carry the release they came from. (#140)
- Pull request previews now start, and show the staging banner and sparse results like the staging site. (#141)
- Fixed a 500 error when fetching a diagnostic whose provider is not installed. (#145)

### Breaking Changes

- * The `/executions` endpoint (and others that return an execution group) will no longer return the full diagnostic definition or the latest execution as an extra field.
    Query the `/diagnostics/catalog` to resolve the provided diagnostic slug instead and access the latest execution as `executions.at(-1)`. (#132)
- * The `/executions` endpoint will by default not list the output files of successfull executions anymore. Add the `include_outputs=true` argument to get them via this endpoint. (#137)
- * The `mip_era` parameter now only accepts `CMIP6` or `CMIP7`, and any other value returns a 422. An era now keeps the execution groups that draw on that era or on no model data, such as observation-only groups.
  * Diagnostics and `/executions/statistics` now report execution group counts under `groups`, and `groups_by_mip_era` replaced `execution_groups_by_mip_era`.
  * Removed `execution_count` and `successful_execution_count` from diagnostics.
  * Group counts, diagnostic values, value flags and the executions list now leave out retracted executions.
  * A diagnostic's execution groups now only cover its promoted version.
  * An execution group from a superseded diagnostic version now returns its values instead of none.
  * Filtering by `source_id`, and listing a dataset's executions, now look at each group's latest execution only.
  * Resource usage now only covers the promoted version of each diagnostic, and still includes retracted executions.
  * `/executions` now returns a 422 for an unknown `failure_reason`, or a negative `limit` or `offset`.
  * `/datasets` is now ordered by slug.
  * Removed the unused `/diagnostics/facets` and `/diagnostics/{provider}/{diagnostic}/executions` endpoints.

  (#147)

### Trivial Changes

- Updates katex to 0.19. (#124)
- * Added [Fallow](https://fallow.tools) to check the frontend for dead code, duplication and complexity (`make fallow-audit`), skipping generated code and the shadcn/ui components.
  * Removed dead frontend code: unused exports, components, hook state and props, barrel re-exports, and an import cycle between the theme explorer and its route.
  * Merged duplicated code into shared pieces, such as one data table and one panel for the scalar and series value tabs, one execution status badge, and shared stat cards, filter popovers and chart empty states.
  * Moved logic out of components into tested functions (log parsing and summary, filters and search params, pagination, chart data and axes, Taylor diagram geometry, explorer mapping), split the largest components and the chart drawing code into smaller parts, and pointed two tests at the real code instead of copies of it. The frontend test suite grew from 384 to 626 tests.
  * Moved build-only packages to `devDependencies` and `@tailwindcss/typography`, which the styles load, to `dependencies`, and updated the deprecated Biome config.

  (#139)
- Added API performance tests against a synthetic database, which CI compares against the base branch on every pull request. (#145)
- Updated dependencies, including climate-ref 0.19.2 and Sentry 11. (#146)
- The CI performance comparison now uses the pull request's base commit, and writes a table of every endpoint's timings to the job summary, naming each endpoint it could not compare. (#149)
- Tagged each `climate-ref-frontend` image with `sha-<commit>`, so a deployment can pin the exact build. (#154)


## v0.8.2 (2026-10-15)

### Bug Fixes

- Season box-whisker charts now show seasons in chronological order and label "ann" as "annual".
  Box-whisker chart tooltips now show for the correct point under the cursor in Firefox.
  The executions list now shows placeholder rows while loading instead of "No results.".
  The datasets list now keeps its rows visible while loading more. (#127)
- Moved frontend error reporting to the climate-resource Sentry organisation. (#130)


## v0.8.1 (2026-09-11)

### Improvements

- Sets an explicit `Cache-Control` policy on every response, so Cloudflare can be told to respect the origin.

  - Hashed build assets are immutable.
  - HTML is revalidated on every load.
  - Result files keep for 30 days (`RESULTS_CACHE_MAX_AGE`).
  - Other API responses keep for 10 minutes (`API_CACHE_MAX_AGE`).
  - The health, metrics and about endpoints are never stored.

  (#121)
- Sends `Vary: Origin` on every API response, so Cloudflare keeps one cached copy per origin. (#122)

### Trivial Changes

- Updates zod to v4 and drops the `@tanstack/zod-adapter` package.
  Route search schemas are now passed straight to `validateSearch`. (#79)
- Updates the frontend non-major dependencies. (#111)


## v0.8.0 (2026-09-10)

### Features

- Added a Prometheus `/metrics` endpoint with request count and latency histograms. (#120)

### Bug Fixes

- Fixed pages failing to load in Safari after a new release, with a cross-origin script error.
  Direct links to pages are now served without a redirect. (#119)


## v0.7.12 (2026-09-10)

### Bug Fixes

- Released the database connection before streaming a result or log file,
  so a slow download no longer holds a connection open for its whole duration.
  Read files in 64KB chunks rather than 1KB, so downloads finish faster. (#118)


## v0.7.11 (2026-09-10)

### Improvements

- The diagnostics catalog now appears straight away, and fills in which diagnostics have scalar and series values once those finish loading. (#116)

### Bug Fixes

- Fixed page view analytics going missing behind Cloudflare.
  The analytics proxy now forwards the visitor IP that Cloudflare reports,
  so Plausible no longer mistakes the visits for data centre traffic. (#117)


## v0.7.10 (2026-09-10)

### Improvements

- Sped up the executions list and diagnostic pages, which could take tens of seconds on large databases. (#115)


## v0.7.9 (2026-09-10)

### Improvements

- Sped up loading the diagnostic facets, which could take over a minute on large databases. (#114)


## v0.7.8 (2026-09-10)

### Bug Fixes

- Fixed the layout on phone widths.
  The navigation links now sit behind a menu button on small screens, so pages no longer scroll sideways,
  and the welcome dialog can be scrolled to reach its buttons. (#113)


## v0.7.7 (2026-09-10)

### Improvements

- Charts are now shown once three models are available, rather than four. (#112)


## v0.7.6 (2026-09-07)

### Bug Fixes

- Fixed nearest-value selection and record highlighting in box-and-whisker charts, excluded clipped values from selection, and corrected whisker endpoints.

  Corrected the sea surface salinity Taylor diagram title and removed empty grid slots between explorer card groups. (#109)


## v0.7.5 (2026-09-07)

### Features

- Added a model view at `/models`, with a page per model that shows:

  - how many execution groups it took part in, and how many of them succeeded,
  - which diagnostics it failed,
  - where each of its scalar metrics sits against the spread of every other model that reported the same metric.

  The pages are reachable by URL but are not yet linked from the navigation.

  (#107)

### Improvements

- Added a warning to series charts that draw more than one reference curve.
  The reference dataset is regridded onto each model grid, so a single set of observations can appear as
  several different curves. (#108)


## v0.7.4 (2026-09-07)

### Features

- Added a call to action linking to the CMIP7 diagnostics and the CMIP7 availability dashboard. (#104)

### Improvements

- Updated to use climate-ref v0.18.0.
  The read-only database mode no longer opens SQLite as immutable, so the API picks up changes made by a worker while it is running. (#103)
- Added a region dropdown to the regional temperature and precipitation trend cards, with regions listed by their full IPCC AR6 names. (#105)

### Trivial Changes

- Releases are now published automatically when a tag is pushed, rather than left as drafts. (#106)


## v0.7.3 (2026-09-06)

### Bug Fixes

- Fixed the temperature, precipitation and burnt fraction annual cycle charts in the explorer, which showed no data.

  Fixed the AMOC strength chart and enabled the cloud radiative effects chart in the explorer. (#100)


## v0.7.2 (2026-09-06)

### Bug Fixes

- Corrected the reference dataset labels shown for diagnostics and collections,
  so they match the datasets the climate-ref providers use. (#98)


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
