#!/usr/bin/env bash
#
# Update the backend test database by running climate-ref's alembic migrations.
#
# This is needed whenever the climate-ref dependency is updated and the
# database schema has changed (new columns, tables, etc.).
#
# Usage:
#   ./scripts/update-test-data.sh
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/../backend" && pwd)"

echo "==> Migrating test database"
cd "${BACKEND_DIR}"

uv run python -c "
from climate_ref.database import Database
from ref_backend.testing import test_ref_config

config = test_ref_config()
db = Database(config.db.database_url)

print(f'Database URL: {db.url}')
print('Running migrations...')
db.migrate(config, skip_backup=False)
print('Migrations complete.')

from sqlalchemy import text
session = db.session
for table in ['metric_value', 'execution_output', 'execution']:
    count = session.execute(text(f'SELECT count(*) FROM {table}')).scalar()
    print(f'{table} rows: {count}')
session.close()

print('Database verification passed.')
"

echo "==> Done. Test database has been migrated successfully."
