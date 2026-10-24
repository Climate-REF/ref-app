"""
Summarise a `perf-compare.sh` run as a Markdown table of medians, base against this checkout.

Usage: python3 scripts/perf-report.py WORK_DIR BASE THRESHOLD

Reads `base.json`, `base.xml` and `head.json` from WORK_DIR.
The table goes to stdout, and to the job summary when run in GitHub Actions.
Each endpoint with no baseline is also named in a warning annotation.
"""

import json
import os
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

_PARAM = re.compile(r"\[(.*)\]$")


def _endpoint(name: str) -> str:
    match = _PARAM.search(name)
    return match.group(1) if match else name


def _medians(path: Path) -> dict[str, float]:
    if not path.exists():
        return {}
    benchmarks = json.loads(path.read_text())["benchmarks"]
    return {_endpoint(b["name"]): b["stats"]["median"] * 1000 for b in benchmarks}


def _not_run(report: Path) -> dict[str, str]:
    """Why each endpoint has no baseline, from the base run's JUnit report."""
    reasons = {}
    for case in ET.parse(report).iter("testcase"):  # noqa: S314, written by our own pytest run
        problems = [p for tag in ("failure", "error", "skipped") if (p := case.find(tag)) is not None]
        if problems:
            message = problems[0].get("message") or problems[0].tag
            reasons[_endpoint(case.get("name", ""))] = message.splitlines()[0][:200].replace("|", "\\|")
    return reasons


def main() -> None:
    work, base, threshold = Path(sys.argv[1]), sys.argv[2], float(sys.argv[3])
    if re.fullmatch(r"[0-9a-f]{40}", base):
        base = base[:12]
    if not (work / "base.xml").exists():
        sys.exit(f"::error::the performance tests did not run on {base}")

    before, after = _medians(work / "base.json"), _medians(work / "head.json")
    not_run = _not_run(work / "base.xml")
    for endpoint, reason in not_run.items():
        print(f"::warning title=Not compared::{endpoint} on {base}: {reason.replace('%', '%25')}")

    rounds, scale = os.environ.get("REF_PERF_ROUNDS", "5"), os.environ.get("REF_PERF_SCALE", "0.1")
    lines = [
        f"### API performance against `{base}`",
        "",
        f"Median of {rounds} rounds at scale {scale}. More than {threshold:g}% slower fails the job.",
        "",
    ]
    if not after:
        lines.append("No endpoint ran on this branch.")
    else:
        lines += ["| Endpoint | Base (ms) | This branch (ms) | Change |", "| --- | ---: | ---: | ---: |"]
        for endpoint in sorted(after):
            if endpoint not in before:
                reason = not_run.get(endpoint, "no result")
                lines.append(f"| `{endpoint}` | not compared | {after[endpoint]:.1f} | {reason} |")
                continue
            change = round((after[endpoint] / before[endpoint] - 1) * 100)
            flag = " **slower**" if change > threshold else ""
            lines.append(
                f"| `{endpoint}` | {before[endpoint]:.1f} | {after[endpoint]:.1f} | {change:+d}%{flag} |"
            )

    table = "\n".join(lines) + "\n"
    print(table)
    if summary := os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(summary, "a") as f:
            f.write(table)


if __name__ == "__main__":
    main()
