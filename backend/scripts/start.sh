#!/usr/bin/env sh
# Container entrypoint: migrate once (if enabled), then hand over to the API workers.
set -eu

case "${REF_MIGRATE_DATABASE:-false}" in
  1 | true | True | TRUE) ref db migrate ;;
esac

exec fastapi run --workers 4 /app/src/ref_backend/main.py "$@"
