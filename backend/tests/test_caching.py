"""
Tests for the Cache-Control policy applied to every response.
"""

import tempfile
from pathlib import Path

import pytest
from fastapi import FastAPI, HTTPException
from starlette.testclient import TestClient

from ref_backend.builder import SPAStaticFiles
from ref_backend.caching import CacheControlMiddleware


@pytest.fixture()
def spa_client():
    with tempfile.TemporaryDirectory() as tmpdir:
        root = Path(tmpdir)
        (root / "index.html").write_text("<html><body>SPA Root</body></html>")
        (root / "favicon.ico").write_bytes(b"icon")
        (root / "assets").mkdir()
        (root / "assets" / "main-abc123.js").write_text("console.log('app');")

        app = FastAPI()
        app.add_middleware(CacheControlMiddleware, api_prefix="/api/v1", api_max_age=120, results_max_age=999)

        @app.get("/api/v1/things")
        def things():
            return {"ok": True}

        @app.get("/api/v1/results/{result_id}")
        def result(result_id: int):
            return {"id": result_id}

        @app.get("/api/v1/missing")
        def missing():
            raise HTTPException(status_code=404)

        @app.post("/log/api/event")
        def event():
            return {"ok": True}

        app.mount("/", SPAStaticFiles(directory=str(root), html=True), name="static")
        with TestClient(app) as c:
            yield c


class TestCacheControlMiddleware:
    def test_hashed_assets_are_immutable(self, spa_client: TestClient):
        r = spa_client.get("/assets/main-abc123.js")
        assert r.headers["cache-control"] == "public, max-age=31536000, immutable"

    def test_html_is_revalidated(self, spa_client: TestClient):
        for path in ("/", "/diagnostics"):
            assert spa_client.get(path).headers["cache-control"] == "no-cache"

    def test_other_static_files_are_cached_briefly(self, spa_client: TestClient):
        assert spa_client.get("/favicon.ico").headers["cache-control"] == "public, max-age=3600"

    def test_api_uses_configured_ttl(self, spa_client: TestClient):
        assert spa_client.get("/api/v1/things").headers["cache-control"] == "public, max-age=120"

    def test_results_use_long_ttl(self, spa_client: TestClient):
        assert spa_client.get("/api/v1/results/1").headers["cache-control"] == "public, max-age=999"

    def test_errors_are_not_cached(self, spa_client: TestClient):
        r = spa_client.get("/api/v1/missing")
        assert r.status_code == 404
        assert "cache-control" not in r.headers

    def test_writes_are_not_stored(self, spa_client: TestClient):
        assert spa_client.post("/log/api/event").headers["cache-control"] == "no-store"


class TestLiveEndpointsAreNotStored:
    @pytest.mark.parametrize("path", ["/api/v1/utils/health-check/", "/api/v1/utils/about", "/metrics"])
    def test_no_store(self, client: TestClient, path: str):
        r = client.get(path)
        assert r.status_code == 200
        assert r.headers["cache-control"] == "no-store"

    def test_api_default_ttl(self, client: TestClient):
        r = client.get("/api/v1/diagnostics/")
        assert r.status_code == 200
        assert r.headers["cache-control"] == "public, max-age=600"
