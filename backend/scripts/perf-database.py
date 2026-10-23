"""
Print the path of a synthetic database for the API performance tests, building it on first use.

Usage: uv run python scripts/perf-database.py [--revision REVISION]

With ``--revision``, the database is a copy migrated down to that Alembic revision,
so a release with an older schema can read it.
Both are cached in ``REF_PERF_CACHE``, and ``REF_PERF_SCALE`` sets the size (default 0.1).
"""

import argparse
import os
import shutil
from pathlib import Path

import alembic.command
from alembic.script import ScriptDirectory

from climate_ref.config import Config
from climate_ref.database import Database
from climate_ref.testing.synthetic import cached_synthetic_database


def _open(path: Path) -> tuple[Config, Database]:
    config = Config()
    config.db.database_url = f"sqlite:///{path}"
    return config, Database.from_config(config, run_migrations=False)


def migrated_down(path: Path, revision: str) -> Path:
    """Return a copy of ``path`` migrated down to ``revision``, building it on first use."""
    config, database = _open(path)
    head = ScriptDirectory.from_config(database.alembic_config(config)).get_current_head()
    database.close()
    if revision == head:
        return path

    target = path.with_name(f"{path.stem}-{revision}.db")
    if target.exists():
        return target
    tmp = target.with_name(f"{target.name}.{os.getpid()}.tmp")
    shutil.copyfile(path, tmp)
    config, database = _open(tmp)
    alembic.command.downgrade(database.alembic_config(config), revision)
    database.optimize()
    database.close()
    tmp.replace(target)
    return target


def main() -> None:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--revision", help="Alembic revision to migrate the copy down to")
    args = parser.parse_args()

    cache = Path(os.environ.get("REF_PERF_CACHE", Path.home() / ".cache" / "ref-app" / "perf"))
    path = cached_synthetic_database(cache, scale=float(os.environ.get("REF_PERF_SCALE", "0.1")))
    if args.revision:
        path = migrated_down(path, args.revision)
    print(path)


if __name__ == "__main__":
    main()
