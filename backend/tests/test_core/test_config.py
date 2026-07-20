"""Tests for the Settings secret guard and CORS parsing."""

import pytest

from ref_backend.core.config import Settings, parse_cors


class TestDefaultSecretGuard:
    """Test that a default placeholder secret is refused outside local development."""

    def test_default_secret_raises_outside_local(self):
        """A default SECRET_KEY in a non-local environment raises ValueError."""
        with pytest.raises(ValueError, match="changethis"):
            Settings(_env_file=None, SECRET_KEY="changethis", ENVIRONMENT="staging")  # noqa: S106

    def test_default_secret_warns_in_local(self):
        """A default SECRET_KEY in the local environment warns but still constructs."""
        with pytest.warns(UserWarning, match="changethis"):
            settings = Settings(_env_file=None, SECRET_KEY="changethis", ENVIRONMENT="local")  # noqa: S106
        assert settings.SECRET_KEY == "changethis"  # noqa: S105

    def test_non_default_secret_constructs_without_warning(self, recwarn):
        """A non-default SECRET_KEY constructs cleanly in staging with no warning."""
        settings = Settings(_env_file=None, SECRET_KEY="a-real-secret-value", ENVIRONMENT="staging")  # noqa: S106
        assert settings.SECRET_KEY == "a-real-secret-value"  # noqa: S105
        assert len(recwarn) == 0


class TestParseCors:
    """Test the parse_cors BeforeValidator."""

    def test_splits_comma_separated_string(self):
        """A comma-separated string is split into a list of trimmed origins."""
        result = parse_cors("http://a.example, http://b.example")
        assert result == ["http://a.example", "http://b.example"]

    def test_list_passes_through(self):
        """A list value passes through unchanged."""
        result = parse_cors(["http://a.example", "http://b.example"])
        assert result == ["http://a.example", "http://b.example"]
