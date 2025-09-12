"""
JSON utilities for handling special float values like NaN and infinity
"""

import math
from typing import Any

from loguru import logger


def sanitize_float_value(value: float | Any) -> float | Any:
    """
    Sanitize float values to handle NaN and infinity values that are not JSON compliant.

    Args:
        value: The value to sanitize

    Returns
    -------
        - 0.0 if the value is NaN
        - 0.0 if the value is infinity (positive or negative)
        - The original value if it's a valid float or not a float
    """
    if isinstance(value, float):
        if math.isnan(value):
            # The None values will be converted to null in JSON
            return None
        if math.isinf(value):
            return None
    logger.warning(f"Non-float value encountered during sanitization: {value}")
    return value


def sanitize_float_list(values: list[float | Any]) -> list[float | Any]:
    """
    Sanitize a list of values, handling NaN and infinity values.

    Args:
        values: List of values to sanitize

    Returns
    -------
        List with NaN and infinity values replaced with 0.0
    """
    return [sanitize_float_value(value) for value in values]


def sanitize_dict_values(data: dict[str, Any]) -> dict[str, Any]:
    """
    Recursively sanitize dictionary values, handling NaN and infinity in nested structures.

    Args:
        data: Dictionary to sanitize

    Returns
    -------
        Dictionary with sanitized values (NaN and infinity replaced with 0.0)
    """
    sanitized: dict[str, Any] = {}
    for key, value in data.items():
        if isinstance(value, dict):
            sanitized[key] = sanitize_dict_values(value)
        elif isinstance(value, list):
            sanitized[key] = sanitize_float_list(value)
        else:
            sanitized[key] = sanitize_float_value(value)
    return sanitized
