"""
Main entry point for the FastAPI application
"""

from ref_backend.api import deps
from ref_backend.core.config import get_settings
from ref_backend.testing import test_ref_config, test_settings

# Load the settings early, to avoid climate-ref setting the `REF_CONFIGURATION` environment variable
settings = get_settings()

from ref_backend.builder import build_app
from ref_backend.core.ref import get_ref_config

ref_config = get_ref_config(settings)

app = build_app(settings, ref_config)

if settings.USE_TEST_DATA:
    print("Using test data for the application.")

    app.dependency_overrides[get_settings] = test_settings
    app.dependency_overrides[deps._ref_config_dependency] = test_ref_config
