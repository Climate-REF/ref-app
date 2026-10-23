#!/usr/bin/env bash
# Time the API performance tests on a base ref and on this checkout, then fail if this checkout is slower.
#
# Usage: scripts/perf-compare.sh [base ref, default origin/main]
#
# REF_PERF_SCALE (default 0.1), REF_PERF_ROUNDS and REF_PERF_CACHE are passed through to the tests.
# REF_PERF_THRESHOLD is the allowed slowdown of each endpoint's median, in percent (default 30).
set -euo pipefail

BASE="${1:-origin/main}"
BACKEND="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$(mktemp -d)"
trap 'git -C "$BACKEND" worktree remove --force "$WORK/base" >/dev/null 2>&1 || true; rm -rf "$WORK"' EXIT

export REF_PERF_SCALE="${REF_PERF_SCALE:-0.1}"
STORAGE="file://$WORK/benchmarks"

git -C "$BACKEND" worktree add --quiet --detach "$WORK/base" "$BASE"
(cd "$WORK/base/backend" && uv sync --locked --quiet)

# The base may pin an older climate-ref, so it reads a copy migrated down to its schema.
BASE_REVISION="$(cd "$WORK/base/backend" && uv run --no-sync python -c '
import importlib.resources
from alembic.config import Config
from alembic.script import ScriptDirectory
ini = importlib.resources.files("climate_ref") / "alembic.ini"
print(ScriptDirectory.from_config(Config(str(ini))).get_current_head())
')"
cd "$BACKEND"
HEAD_DATABASE="$(uv run python scripts/perf-database.py)"
BASE_DATABASE="$(uv run python scripts/perf-database.py --revision "$BASE_REVISION")"

# The base code runs this checkout's tests, so both sides time the same requests.
# Endpoints missing on the base fail there and are left out of the comparison.
(
    cd "$WORK/base/backend"
    REF_PERF_DATABASE="$BASE_DATABASE" uv run --no-sync --with pytest-benchmark pytest "$BACKEND/tests/perf" \
        --rootdir="$BACKEND" --confcutdir="$BACKEND/tests/perf" -p no:cacheprovider -q \
        --benchmark-storage="$STORAGE" --benchmark-save=base
) || echo "::warning::some performance tests failed on $BASE, comparing the rest"

REF_PERF_DATABASE="$HEAD_DATABASE" uv run pytest tests/perf -q \
    --benchmark-storage="$STORAGE" --benchmark-compare \
    --benchmark-compare-fail="median:${REF_PERF_THRESHOLD:-30}%" \
    --benchmark-columns=median,iqr,rounds
