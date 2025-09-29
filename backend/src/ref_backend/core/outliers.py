import math
import statistics
from collections.abc import Sequence
from typing import Literal

import pandas as pd

from climate_ref import models
from ref_backend.models import AnnotatedScalarValue


def flag_outliers_iqr(values: Sequence[float], factor: float = 5.0, min_n: int = 10) -> list[bool]:
    """
    Flag outliers using the IQR method.

    Returns a list of booleans where True indicates an outlier.
    """
    n = len(values)
    if n < min_n:
        return [False] * n

    # Compute Q1 and Q3
    quantiles = statistics.quantiles(values, n=4, method="inclusive")
    q1, q3 = quantiles[0], quantiles[2]
    iqr = q3 - q1

    lower_bound = q1 - factor * iqr
    upper_bound = q3 + factor * iqr

    return [v < lower_bound or v > upper_bound for v in values]


def detect_outliers_in_scalar_values(
    scalar_values: list[models.ScalarMetricValue],
    factor: float = 3.0,
    min_n: int = 4,
    group_by: Sequence[str] = ("statistic", "metric"),
) -> tuple[list[AnnotatedScalarValue], int]:
    """Detect outliers in scalar metric values grouped by stable diagnostic facets.

    Parameters
    ----------
    scalar_values
        A list of scalar metric value objects to be analyzed.
    factor
        The factor to multiply the IQR by to determine the outlier bounds.
        A value is an outlier if it is less than Q1 - factor * IQR or
        greater than Q3 + factor * IQR.

        Defaults to 3.0.
    min_n
        The minimum number of data points required in a group to perform
        IQR outlier detection. Defaults to 4.
    group_by
        A sequence of dimension names to group the `scalar_values` by before
        performing outlier detection. Defaults to ("statistic", "metric").

    Returns
    -------
    tuple[list[AnnotatedScalarValue], int]
        A tuple containing:
        - A list of annotated values. Each item contains the original value and outlier info.
        - The total count of detected outliers.
    """
    # Group by stable diagnostic facets (exclude stoplist keys)
    df = pd.DataFrame(
        [{"scalar_value": sv, "value": sv.value, **sv.dimensions, "id": sv.id} for sv in scalar_values]
    )
    annotated = []
    total_outliers = 0

    group_by = [g for g in group_by if g in df.columns]

    for _, group_values in df.groupby(list(group_by)):
        print(group_values)
        # Identify non-finite values (NaN, inf) as outliers
        finite_flags = group_values.value.apply(
            lambda x: isinstance(x, int | float) and not math.isinf(x) and not math.isnan(x)
        )
        # Apply IQR only if group has enough values
        if len(group_values) >= min_n:
            iqr_flags = flag_outliers_iqr(group_values.value.to_list(), factor=factor)
        else:
            iqr_flags = [False] * len(group_values)

        # Combine flags: item is outlier if iqr-flagged
        for sv, is_outside_iqr, is_finite in zip(group_values.scalar_value, iqr_flags, finite_flags):
            is_outlier = is_outside_iqr or not is_finite
            verification_status: Literal["verified", "unverified"] = (
                "unverified" if is_outlier else "verified"
            )
            annotated.append(
                AnnotatedScalarValue(
                    value=sv,
                    is_outlier=is_outlier,
                    verification_status=verification_status,
                )
            )
            if is_outlier:
                total_outliers += 1

    return annotated, total_outliers
