# mypy: disable-error-code="no-any-return"
"""
Shared utilities for parsing multi-value query parameters
"""

from typing import Any

from sqlalchemy.sql.elements import BinaryExpression


def _normalize_list_from_value(value: Any) -> list[str] | None:
    """
    Convert a value that may be a list or a comma-separated string into a cleaned list of strings.

    Returns None if the input should be treated as a single value (no list semantics).
    """
    if value is None:
        return None

    # If already a list (e.g. from parsed JSON), coerce & clean
    if isinstance(value, list):
        vals = [str(v).strip() for v in value if v is not None and str(v).strip()]
        return vals if vals else None

    # If a comma-separated string, split and clean
    if isinstance(value, str) and "," in value:
        vals = [v.strip() for v in value.split(",") if v.strip()]
        return vals if vals else None

    # Otherwise, treat as a single scalar value
    return None


def build_filter_clause(column: Any, value: Any) -> BinaryExpression[Any]:
    """
    Build a SQLAlchemy binary expression for a filter on `column` given `value`.

    Behavior:
    - If `value` is a list (or a comma-separated string with multiple items),
      an `IN` clause is returned.
    - If `value` contains exactly one normalized item, a simple equality
      (`column == item`) is returned.
    - Otherwise, fall back to equality with the original `value`.

    This function is intended to be used in route handlers where query values
    may be single values, comma-separated strings, or parsed JSON lists.
    """
    # Handle lists explicitly
    if isinstance(value, list):
        vals = _normalize_list_from_value(value)
        if vals is None:
            # Empty list -> fallback equality (keeps prior behavior)
            return column == value
        if len(vals) == 1:
            return column == vals[0]
        return column.in_(vals)

    # Handle comma-separated strings or other scalars
    vals = _normalize_list_from_value(value)
    if vals:
        if len(vals) == 1:
            return column == vals[0]
        return column.in_(vals)

    # Default: equality
    return column == value
