#! /usr/bin/env bash
# Copy the OpenAPI specification to the frontend and generate the SDK

set -e
set -x

cd "$(dirname "$0")/.."

# The app logs to stdout, so the schema is written to the file directly rather than piped.
pushd backend
uv run python -c "
import json, pathlib, ref_backend.main
pathlib.Path('../frontend/openapi.json').write_text(json.dumps(ref_backend.main.app.openapi()))
"
popd

# openapi-ts needs the TypeScript 5 compiler API, which TypeScript 7 does not ship.
# Running from a temp directory stops npx reusing the project's node_modules.
OPENAPI_TS_VERSION=$(node -p "require('./frontend/package.json').devDependencies['@hey-api/openapi-ts']")
CONFIG="$(pwd)/frontend/openapi-ts.config.ts"
pushd "$(mktemp -d)"
npx --yes --package typescript@5 --package "@hey-api/openapi-ts@${OPENAPI_TS_VERSION}" openapi-ts --file "$CONFIG"
popd
