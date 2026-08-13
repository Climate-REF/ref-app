"""Tests for the Settings CORS parsing."""

from ref_backend.core.config import parse_cors


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
