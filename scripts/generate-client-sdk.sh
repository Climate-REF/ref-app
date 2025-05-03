#! /usr/bin/env bash
# Copy the OpenAPI specification to the frontend and generate the SDK

set -e
set -x

pushd backend
uv run python -c "import ref_backend.main; import json; print(json.dumps(ref_backend.main.app.openapi()))" > ../frontend/openapi.json
popd
pushd frontend
npm run openapi-ts
