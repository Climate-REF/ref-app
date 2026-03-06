"""
Tests for SPAStaticFiles fallback behavior.

Verifies that client-side routes (e.g. /diagnostics?view=cards) are served
index.html instead of returning 404, while real static assets and API routes
continue to work normally.
"""

import tempfile
from pathlib import Path

import pytest
from fastapi import FastAPI
from starlette.testclient import TestClient

from ref_backend.builder import SPAStaticFiles


@pytest.fixture()
def static_dir():
    """Create a temporary static directory with an index.html and a nested asset."""
    with tempfile.TemporaryDirectory() as tmpdir:
        root = Path(tmpdir)

        (root / "index.html").write_text("<html><body>SPA Root</body></html>")

        assets_dir = root / "assets"
        assets_dir.mkdir()
        (assets_dir / "main.js").write_text("console.log('app');")

        yield root


@pytest.fixture()
def spa_app(static_dir):
    """Create a minimal FastAPI app with SPAStaticFiles mounted."""
    app = FastAPI()

    @app.get("/api/v1/health")
    def health():
        return {"ok": True}

    app.mount(
        "/",
        SPAStaticFiles(directory=str(static_dir), html=True),
        name="static",
    )
    return app


@pytest.fixture()
def spa_client(spa_app):
    with TestClient(spa_app) as c:
        yield c


class TestSPAStaticFiles:
    def test_root_serves_index_html(self, spa_client: TestClient):
        """Root path should serve index.html."""
        r = spa_client.get("/")
        assert r.status_code == 200
        assert "SPA Root" in r.text

    def test_real_static_asset_served(self, spa_client: TestClient):
        """Existing static files should be served directly."""
        r = spa_client.get("/assets/main.js")
        assert r.status_code == 200
        assert "console.log" in r.text

    def test_unknown_path_falls_back_to_index(self, spa_client: TestClient):
        """Non-existent paths should fall back to index.html for client-side routing."""
        r = spa_client.get("/diagnostics")
        assert r.status_code == 200
        assert "SPA Root" in r.text

    def test_unknown_path_with_query_params(self, spa_client: TestClient):
        """Paths with query params should also fall back to index.html."""
        r = spa_client.get("/diagnostics?view=cards")
        assert r.status_code == 200
        assert "SPA Root" in r.text

    def test_nested_unknown_path(self, spa_client: TestClient):
        """Deeply nested non-existent paths should fall back to index.html."""
        r = spa_client.get("/some/nested/route")
        assert r.status_code == 200
        assert "SPA Root" in r.text

    def test_api_route_not_affected(self, spa_client: TestClient):
        """API routes registered before the static mount should still work."""
        r = spa_client.get("/api/v1/health")
        assert r.status_code == 200
        assert r.json() == {"ok": True}
