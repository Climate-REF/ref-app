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


def calculate_iqr_bounds_by_source_id(
    df: pd.DataFrame, factor: float = 3.0, min_n: int = 4
) -> tuple[float, float] | None:
    """
    Calculate IQR bounds using source_id means for equal model weighting.

    This function calculates mean value for each source_id and then
    computes IQR bounds on these means, ensuring each model gets equal
    weight regardless of number of ensemble members.

    Parameters
    ----------
    df : pd.DataFrame
        DataFrame containing scalar values with dimensions including source_id
    factor : float
        The factor to multiply IQR by to determine outlier bounds
    min_n : int
        Minimum number of source_ids required to perform outlier detection

    Returns
    -------
    tuple[float, float] | None
        Tuple of (lower_bound, upper_bound) or None if insufficient data
    """
    # Check if source_id column exists
    if "source_id" not in df.columns:
        return None

    # Separate Reference values (exclude from IQR calculation)
    reference_mask = df["source_id"] == "Reference"
    non_reference_df = df[~reference_mask]

    # Group by source_id and calculate mean for each
    source_id_means = non_reference_df.groupby("source_id")["value"].mean()

    # Check if we have enough source_ids for outlier detection
    if len(source_id_means) < min_n:
        return None

    # Calculate IQR on source_id means
    means_list = source_id_means.tolist()
    quantiles = statistics.quantiles(means_list, n=4, method="inclusive")
    q1, q3 = quantiles[0], quantiles[2]
    iqr = q3 - q1

    lower_bound = q1 - factor * iqr
    upper_bound = q3 + factor * iqr

    return lower_bound, upper_bound


def detect_outliers_in_scalar_values(
    scalar_values: Sequence[models.ScalarMetricValue],
    factor: float = 3.0,
    min_n: int = 4,
    group_by: Sequence[str] = ("statistic", "metric"),
) -> tuple[list[AnnotatedScalarValue], int]:
    """Detect outliers in scalar metric values grouped by stable diagnostic facets.

    This function uses source_id-aware outlier detection, where IQR bounds are calculated
    using the mean value of each source_id rather than on all individual ensemble members.
    This ensures each model gets equal weight regardless of number of ensemble members.
    The calculated bounds are then applied to individual values for outlier detection.

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
        The minimum number of source_ids required in a group to perform
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
        # Identify non-finite values (NaN, inf) as outliers
        finite_flags = group_values.value.apply(
            lambda x: isinstance(x, int | float) and not math.isinf(x) and not math.isnan(x)
        )
        # Apply source_id-aware outlier detection if source_id exists
        if "source_id" in group_values.columns and len(group_values) >= min_n:
            iqr_bounds = calculate_iqr_bounds_by_source_id(group_values, factor=factor, min_n=min_n)

            if iqr_bounds is not None:
                lower_bound, upper_bound = iqr_bounds
                # Apply bounds to individual values (Reference values always non-outlier)
                source_id_flags = group_values.apply(
                    lambda row: (row["value"] < lower_bound or row["value"] > upper_bound)
                    if row["source_id"] != "Reference"
                    else False,
                    axis=1,
                )
            else:
                # Fallback if insufficient source_ids
                source_id_flags = [False] * len(group_values)  # type: ignore
        else:
            # Fallback to original IQR method if no source_id or insufficient data
            if len(group_values) >= min_n:
                iqr_flags = flag_outliers_iqr(group_values.value.to_list(), factor=factor)
            else:
                iqr_flags = [False] * len(group_values)
            source_id_flags = iqr_flags  # type: ignore

        # Combine flags: item is outlier if flagged by source_id method OR non-finite
        for sv, is_source_outlier, is_finite in zip(group_values.scalar_value, source_id_flags, finite_flags):
            is_outlier = is_source_outlier or not is_finite
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
