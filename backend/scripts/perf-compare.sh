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
# Inside this checkout, because pytest-benchmark crashes printing its machine_info warning for storage outside it.
BENCHMARKS="$BACKEND/.perf-benchmarks"
trap 'git -C "$BACKEND" worktree remove --force "$WORK/base" >/dev/null 2>&1 || true; rm -rf "$WORK" "$BENCHMARKS"' EXIT

export REF_PERF_SCALE="${REF_PERF_SCALE:-0.1}"
STORAGE="file://$BENCHMARKS"

git -C "$BACKEND" worktree add --quiet --detach "$WORK/base" "$BASE"

# The base code runs this checkout's tests, so both sides time the same requests.
# Endpoints missing on the base fail there and are left out of the comparison.
(
    cd "$WORK/base/backend"
    uv sync --locked --quiet
    uv run --with pytest-benchmark pytest "$BACKEND/tests/perf" \
        --rootdir="$BACKEND" --confcutdir="$BACKEND/tests/perf" -p no:cacheprovider -q \
        --benchmark-storage="$STORAGE" --benchmark-save=base \
        --benchmark-json="$WORK/base.json" --junitxml="$WORK/base.xml"
) || true

cd "$BACKEND"
status=0
uv run pytest tests/perf -q \
    --benchmark-storage="$STORAGE" --benchmark-compare \
    --benchmark-compare-fail="median:${REF_PERF_THRESHOLD:-30}%" \
    --benchmark-columns=median,iqr,rounds --benchmark-json="$WORK/head.json" || status=$?

python3 scripts/perf-report.py "$WORK" "$BASE" "${REF_PERF_THRESHOLD:-30}"
exit "$status"
