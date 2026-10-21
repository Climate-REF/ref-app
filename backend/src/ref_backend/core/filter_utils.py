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
    if isinstance(value, list):
        # e.g. from parsed JSON
        items = [str(v) for v in value if v is not None]
    elif isinstance(value, str) and "," in value:
        items = value.split(",")
    else:
        return None

    vals = [item.strip() for item in items if item.strip()]
    return vals or None


def build_filter_clause(column: Any, value: Any) -> BinaryExpression[Any]:
    """
    Build a SQLAlchemy binary expression for a filter on `column` given `value`.

    Behavior:
    - If `value` is a list (or a comma-separated string with multiple items),
      an `IN` clause is returned.
    - If `value` contains exactly one normalized item, a simple equality
      (`column == item`) is returned.
    - Otherwise, fall back to equality with the original `value`,
      including for an empty list.

    This function is intended to be used in route handlers where query values
    may be single values, comma-separated strings, or parsed JSON lists.
    """
    vals = _normalize_list_from_value(value)
    if vals is None:
        return column == value
    if len(vals) == 1:
        return column == vals[0]
    return column.in_(vals)
