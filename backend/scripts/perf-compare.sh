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

# The base code runs this checkout's tests, so both sides time the same requests.
# Endpoints missing on the base fail there and are left out of the comparison.
(
    cd "$WORK/base/backend"
    uv sync --locked --quiet
    uv run --with pytest-benchmark pytest "$BACKEND/tests/perf" \
        --rootdir="$BACKEND" --confcutdir="$BACKEND/tests/perf" -p no:cacheprovider -q \
        --benchmark-storage="$STORAGE" --benchmark-save=base --junitxml="$WORK/base.xml"
) || true

# Name each endpoint that failed on the base, because it has no baseline and is not compared.
python3 - "$WORK/base.xml" "$BASE" <<'EOF'
import os
import sys
import xml.etree.ElementTree as ET

report, base = sys.argv[1:]
if not os.path.exists(report):
    sys.exit(f"::error::the performance tests did not run on {base}")
lines = []
for case in ET.parse(report).iter("testcase"):
    problem = case.find("failure")
    if problem is None:
        problem = case.find("error")
    if problem is not None:
        name, reason = case.get("name"), (problem.get("message") or "failed").splitlines()[0][:200]
        print(f"::warning title=Not compared::{name} failed on {base}: {reason.replace('%', '%25')}")
        lines.append(f"- `{name}`: {reason}")
if lines and "GITHUB_STEP_SUMMARY" in os.environ:
    with open(os.environ["GITHUB_STEP_SUMMARY"], "a") as summary:
        summary.write(f"### Not compared, because they failed on {base}\n\n" + "\n".join(lines) + "\n")
EOF

cd "$BACKEND"
uv run pytest tests/perf -q \
    --benchmark-storage="$STORAGE" --benchmark-compare \
    --benchmark-compare-fail="median:${REF_PERF_THRESHOLD:-30}%" \
    --benchmark-columns=median,iqr,rounds
