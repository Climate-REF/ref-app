"""Tests for shared utilities for parsing multi-value query parameters."""

from sqlalchemy import Column, MetaData, String, Table

from ref_backend.core.filter_utils import _normalize_list_from_value, build_filter_clause


class TestNormalizeListFromValue:
    """Test the _normalize_list_from_value function."""

    def test_none_returns_none(self):
        """Test that None input returns None."""
        result = _normalize_list_from_value(None)
        assert result is None

    def test_list_input_returns_list(self):
        """Test that list input returns cleaned list."""
        result = _normalize_list_from_value(["a", "b"])
        assert result == ["a", "b"]

    def test_comma_separated_string_returns_list(self):
        """Test that comma-separated string is split into list."""
        result = _normalize_list_from_value("a,b,c")
        assert result == ["a", "b", "c"]

    def test_single_string_without_comma_returns_none(self):
        """Test that single string without comma returns None for equality fallback."""
        result = _normalize_list_from_value("abc")
        assert result is None

    def test_empty_list_returns_none(self):
        """Test that empty list returns None."""
        result = _normalize_list_from_value([])
        assert result is None

    def test_list_with_none_elements_filters_them_out(self):
        """Test that None elements in list are filtered out."""
        result = _normalize_list_from_value([None, "a", None])
        assert result == ["a"]

    def test_list_with_whitespace_trims_values(self):
        """Test that whitespace in list values is trimmed."""
        result = _normalize_list_from_value([" a ", " b "])
        assert result == ["a", "b"]

    def test_comma_separated_with_whitespace(self):
        """Test that comma-separated string with whitespace is cleaned."""
        result = _normalize_list_from_value(" a , b , c ")
        assert result == ["a", "b", "c"]

    def test_list_with_all_none_returns_none(self):
        """Test that list with all None elements returns None."""
        result = _normalize_list_from_value([None, None])
        assert result is None

    def test_list_with_empty_strings_after_strip_returns_none(self):
        """Test that list with only whitespace elements returns None."""
        result = _normalize_list_from_value(["  ", "  "])
        assert result is None


class TestBuildFilterClause:
    """Test the build_filter_clause function."""

    def setup_method(self):
        """Set up test table and column for SQLAlchemy expressions."""
        self.metadata = MetaData()
        self.test_table = Table("test", self.metadata, Column("name", String))
        self.column = self.test_table.c.name

    def _compile_clause(self, clause):
        """Helper to compile SQLAlchemy clause to SQL string."""
        return str(clause.compile(compile_kwargs={"literal_binds": True}))

    def test_single_scalar_value_returns_equality(self):
        """Test that single scalar value returns equality expression."""
        clause = build_filter_clause(self.column, "a")
        sql = self._compile_clause(clause)
        assert "test.name = 'a'" in sql

    def test_comma_separated_string_returns_in_clause(self):
        """Test that comma-separated string returns IN clause."""
        clause = build_filter_clause(self.column, "a,b")
        sql = self._compile_clause(clause)
        assert "test.name IN ('a', 'b')" in sql

    def test_list_returns_in_clause(self):
        """Test that list with multiple values returns IN clause."""
        clause = build_filter_clause(self.column, ["a", "b"])
        sql = self._compile_clause(clause)
        assert "test.name IN ('a', 'b')" in sql

    def test_single_item_list_returns_equality(self):
        """Test that single-item list returns equality expression."""
        clause = build_filter_clause(self.column, ["a"])
        sql = self._compile_clause(clause)
        assert "test.name = 'a'" in sql

    def test_empty_list_returns_equality_fallback(self):
        """Test that empty list falls back to equality with original value."""
        clause = build_filter_clause(self.column, [])
        # Empty list creates an equality clause with the list itself
        # We can't compile this with literal_binds, so just verify the clause type
        assert clause.operator.__name__ == "eq"

    def test_list_with_three_values_returns_in_clause(self):
        """Test that list with three values returns IN clause."""
        clause = build_filter_clause(self.column, ["x", "y", "z"])
        sql = self._compile_clause(clause)
        assert "test.name IN ('x', 'y', 'z')" in sql

    def test_numeric_scalar_returns_equality(self):
        """Test that numeric scalar value returns equality expression."""
        clause = build_filter_clause(self.column, 42)
        sql = self._compile_clause(clause)
        assert "test.name = 42" in sql

    def test_none_value_returns_equality(self):
        """Test that None value returns equality expression."""
        clause = build_filter_clause(self.column, None)
        sql = self._compile_clause(clause)
        assert "test.name IS NULL" in sql or "test.name = NULL" in sql
