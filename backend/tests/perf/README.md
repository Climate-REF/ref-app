# API performance tests

These tests time the API endpoints against a synthetic database shaped like production.
The database comes from `climate_ref.testing.synthetic`, the same generator climate-ref uses for its reader tests.
The data is read-only, so every request can be repeated against the same database.

Each entry in `ENDPOINTS` in `test_endpoints.py` is one request the frontend makes.
An entry fails when one of its queries reads every row of a large table, which `EXPLAIN QUERY PLAN` shows at any scale.
Its `allowed_scans` lists the scans that are known and accepted.

## Running

```bash
make test-perf                   # a tenth of production, quick
make test-perf REF_PERF_SCALE=1  # full size, about 5 GB
```

The database is built on first use and cached in `~/.cache/ref-app/perf` (`REF_PERF_CACHE`).
A change to the shape, the scale, the generator or the migrations builds a new one.
Old databases are not removed, so clear the cache directory by hand.

`REF_PERF_ROUNDS` sets the timed runs per endpoint, default 5.
`REF_PERF_DATABASE` runs against a database built already, e.g. by `scripts/perf-database.py`.

## Comparing against main

```bash
make perf-compare               # against origin/main
make perf-compare BASE=v0.8.2   # against any ref
make perf-compare BASE=$(git describe --tags --abbrev=0)  # against the last release
```

This checks out the base in a temporary worktree and runs this branch's tests against both.
A base that pins an older climate-ref reads a copy of the database migrated down to its schema,
which `scripts/perf-database.py` builds and caches next to the original.
So a comparison against a release also measures the indexes added since.
It fails when an endpoint's median is more than `REF_PERF_THRESHOLD` percent slower than on the base, default 30.
Running the same code twice locally drifts by up to about 20%, so a smaller threshold is noise.
CI runs this on every pull request, and caches the databases until either lock file changes.

## Adding an endpoint

Add an `Endpoint` to `ENDPOINTS`.
The path and parameters are formatted with the `targets` fixture, e.g. `{provider_slug}`,
which picks the busiest diagnostic and execution so each request reads its worst case.
