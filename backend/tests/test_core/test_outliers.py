from unittest.mock import Mock

import pandas as pd

from ref_backend.core.outliers import (
    calculate_iqr_bounds_by_source_id,
    detect_outliers_in_scalar_values,
    flag_outliers_iqr,
)


class TestFlagOutliersIQR:
    """Test the IQR-based outlier detection function."""

    def test_outlier_detection_with_factor_3(self):
        """Test outlier detection with factor=3.0 on controlled data."""
        values = [1, 2, 2, 2, 100]
        result = flag_outliers_iqr(values, factor=3.0, min_n=4)
        expected = [True, False, False, False, True]
        assert result == expected

    def test_outlier_detection_with_factor_1_5(self):
        """Test outlier detection with factor=1.5 on controlled data.

        Both factor=3.0 and factor=1.5 should flag 100 as an outlier because:
        - Q1 = 2, Q3 = 2, IQR = 0
        - Lower bound = Q1 - factor * IQR = 2 - 1.5 * 0 = 2
        - Upper bound = Q3 + factor * IQR = 2 + 1.5 * 0 = 2
        - Any value outside [2, 2] is an outlier, so 100 is flagged
        """
        values = [1, 2, 2, 2, 100]
        result = flag_outliers_iqr(values, factor=1.5, min_n=4)
        expected = [True, False, False, False, True]
        assert result == expected

    def test_insufficient_data_points(self):
        """Test that len(values) < min_n returns all False."""
        values = [1, 2, 2]  # len < 4
        result = flag_outliers_iqr(values, factor=3.0)
        expected = [False, False, False]
        assert result == expected

    def test_zero_iqr_case(self):
        """Test case where IQR == 0 returns all False."""
        values = [5, 5, 5, 5, 5]
        result = flag_outliers_iqr(values, factor=3.0)
        expected = [False, False, False, False, False]
        assert result == expected

    def test_min_n_parameter(self):
        """Test that min_n=4 behavior is validated."""
        # With min_n=4, values with len < 4 should return all False
        values = [1, 2, 2, 2, 100]
        result = flag_outliers_iqr(values, factor=3.0, min_n=4)
        expected = [True, False, False, False, True]
        assert result == expected

        # With min_n=6, this should return all False since len(values) < 6
        result = flag_outliers_iqr(values, factor=3.0, min_n=6)
        expected = [False, False, False, False, False]
        assert result == expected

    def test_normal_outlier_detection(self):
        """Test normal outlier detection with varied data."""
        values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 100]
        result = flag_outliers_iqr(values, factor=1.5)
        # Q1 = 3.25, Q3 = 7.75, IQR = 4.5
        # Lower bound = 3.25 - 1.5 * 4.5 = 3.25 - 6.75 = -3.5
        # Upper bound = 7.75 + 1.5 * 4.5 = 7.75 + 6.75 = 14.5
        # So 100 is an outlier
        expected = [False] * 9 + [True]
        assert result == expected


class TestCalculateIqrBoundsBySourceId:
    """Test the kind-aware IQR bound calculation."""

    def test_excludes_rows_tagged_kind_reference(self):
        """Rows with kind == 'reference' are excluded from the IQR calculation,
        regardless of their source_id."""
        df = pd.DataFrame(
            [
                {"source_id": "model-a", "kind": "model", "value": 1.0},
                {"source_id": "model-b", "kind": "model", "value": 2.0},
                {"source_id": "model-c", "kind": "model", "value": 3.0},
                {"source_id": "model-d", "kind": "model", "value": 4.0},
                # A reference row with an extreme value that must not skew the bounds.
                {"source_id": "model-e", "kind": "reference", "value": 1000.0},
            ]
        )
        bounds_with_reference = calculate_iqr_bounds_by_source_id(df, factor=3.0, min_n=4)

        df_without_reference = df[df["kind"] != "reference"]
        bounds_without_reference = calculate_iqr_bounds_by_source_id(
            df_without_reference, factor=3.0, min_n=4
        )

        assert bounds_with_reference == bounds_without_reference

    def test_missing_kind_column_falls_back_to_no_exclusion(self):
        """When the kind column is absent entirely (older data), no rows are
        treated as reference — fall back to treating all rows as models."""
        df = pd.DataFrame(
            [
                {"source_id": "model-a", "value": 1.0},
                {"source_id": "model-b", "value": 2.0},
                {"source_id": "model-c", "value": 3.0},
                {"source_id": "model-d", "value": 4.0},
            ]
        )
        bounds = calculate_iqr_bounds_by_source_id(df, factor=3.0, min_n=4)
        assert bounds is not None

    def test_none_or_empty_kind_treated_as_model(self):
        """A None or empty kind is treated as a model, not a reference."""
        df = pd.DataFrame(
            [
                {"source_id": "model-a", "kind": None, "value": 1.0},
                {"source_id": "model-b", "kind": "", "value": 2.0},
                {"source_id": "model-c", "kind": "model", "value": 3.0},
                {"source_id": "model-d", "kind": "model", "value": 4.0},
            ]
        )
        bounds = calculate_iqr_bounds_by_source_id(df, factor=3.0, min_n=4)
        # All 4 source_ids should participate (none excluded as reference).
        assert bounds is not None


class TestDetectOutliersInScalarValues:
    """Test the detect_outliers_in_scalar_values function with grouping and auto-flags."""

    def test_auto_flag_non_finite_values(self):
        """Test that non-finite values are auto-flagged as outliers."""
        mock_values = [
            Mock(dimensions={"metric": "rmse", "region": "global"}, value=1.0),
            Mock(dimensions={"metric": "rmse", "region": "global"}, value=float("nan")),
            Mock(dimensions={"metric": "rmse", "region": "global"}, value=float("inf")),
        ]

        annotated, outlier_count = detect_outliers_in_scalar_values(mock_values)  # type: ignore
        flags = [item.is_outlier for item in annotated]

        assert flags == [False, True, True]
        assert outlier_count == 2

    def test_reference_rows_excluded_and_always_non_outlier(self):
        """Rows tagged kind='reference' are excluded from IQR-bound computation
        and are always flagged as non-outlier, regardless of source_id."""
        mock_values = [
            Mock(
                dimensions={
                    "metric": "rmse",
                    "statistic": "mean",
                    "source_id": f"model-{i}",
                    "kind": "model",
                },
                value=float(i),
                id=i,
            )
            for i in range(4)
        ] + [
            Mock(
                dimensions={
                    "metric": "rmse",
                    "statistic": "mean",
                    "source_id": "obs-source",
                    "kind": "reference",
                },
                value=1000.0,
                id=100,
            )
        ]

        annotated, _ = detect_outliers_in_scalar_values(mock_values, min_n=4)
        by_id = {item.value.id: item for item in annotated}

        assert by_id[100].is_outlier is False
        assert by_id[100].verification_status == "verified"

    def test_reference_row_non_outlier_on_fallback_path_without_source_id(self):
        """Rows tagged kind='reference' stay non-outlier even on the fallback
        IQR path taken when no source_id dimension is present. Without the
        kind override on that path, the extreme reference value would be
        flagged an outlier."""
        mock_values = [
            Mock(
                dimensions={"metric": "rmse", "statistic": "mean", "kind": "model"},
                value=float(i),
                id=i,
            )
            for i in range(4)
        ] + [
            Mock(
                dimensions={"metric": "rmse", "statistic": "mean", "kind": "reference"},
                value=1000.0,
                id=100,
            )
        ]

        annotated, _ = detect_outliers_in_scalar_values(mock_values, min_n=4)
        by_id = {item.value.id: item for item in annotated}

        assert by_id[100].is_outlier is False
        assert by_id[100].verification_status == "verified"

    def test_source_id_reference_sentinel_with_kind_model_is_treated_as_model(self):
        """Regression: a row with source_id == 'Reference' but kind == 'model'
        is now treated as a model — it participates in IQR and can be flagged
        an outlier. This proves the source_id sentinel is gone."""
        mock_values = [
            Mock(
                dimensions={"metric": "rmse", "statistic": "mean", "source_id": "model-a", "kind": "model"},
                value=1.0,
                id=0,
            ),
            Mock(
                dimensions={"metric": "rmse", "statistic": "mean", "source_id": "model-b", "kind": "model"},
                value=2.0,
                id=1,
            ),
            Mock(
                dimensions={"metric": "rmse", "statistic": "mean", "source_id": "model-c", "kind": "model"},
                value=3.0,
                id=2,
            ),
            Mock(
                dimensions={"metric": "rmse", "statistic": "mean", "source_id": "model-d", "kind": "model"},
                value=4.0,
                id=3,
            ),
            # Sentinel source_id, but kind says it's actually a model — should
            # be an extreme outlier that participates in (and blows up) the IQR bounds.
            Mock(
                dimensions={"metric": "rmse", "statistic": "mean", "source_id": "Reference", "kind": "model"},
                value=1000.0,
                id=4,
            ),
        ]

        annotated, outlier_count = detect_outliers_in_scalar_values(mock_values, factor=3.0, min_n=4)
        by_id = {item.value.id: item for item in annotated}

        assert by_id[4].is_outlier is True
        assert by_id[4].verification_status == "unverified"
        assert outlier_count == 1

    def test_arbitrary_source_id_with_kind_reference_is_treated_as_reference(self):
        """A row with source_id == 'ACCESS-CM2' but kind == 'reference' is
        treated as a reference: excluded from IQR computation and always
        flagged non-outlier."""
        mock_values = [
            Mock(
                dimensions={"metric": "rmse", "statistic": "mean", "source_id": "model-a", "kind": "model"},
                value=1.0,
                id=0,
            ),
            Mock(
                dimensions={"metric": "rmse", "statistic": "mean", "source_id": "model-b", "kind": "model"},
                value=2.0,
                id=1,
            ),
            Mock(
                dimensions={"metric": "rmse", "statistic": "mean", "source_id": "model-c", "kind": "model"},
                value=2.0,
                id=2,
            ),
            Mock(
                dimensions={"metric": "rmse", "statistic": "mean", "source_id": "model-d", "kind": "model"},
                value=2.0,
                id=3,
            ),
            # Real model source_id, but kind says it's a reference — should be
            # excluded from IQR and always non-outlier despite the extreme value.
            Mock(
                dimensions={
                    "metric": "rmse",
                    "statistic": "mean",
                    "source_id": "ACCESS-CM2",
                    "kind": "reference",
                },
                value=1000.0,
                id=4,
            ),
        ]

        annotated, outlier_count = detect_outliers_in_scalar_values(mock_values, factor=3.0, min_n=4)
        by_id = {item.value.id: item for item in annotated}

        assert by_id[4].is_outlier is False
        assert by_id[4].verification_status == "verified"
        assert outlier_count == 0

    def test_plain_model_rows_outlier_behaviour_unchanged(self):
        """Existing outlier behaviour for plain model rows (kind='model') still
        holds: an extreme model value is flagged an outlier."""
        mock_values = [
            Mock(
                dimensions={
                    "metric": "rmse",
                    "statistic": "mean",
                    "source_id": f"model-{i}",
                    "kind": "model",
                },
                value=2.0,
                id=i,
            )
            for i in range(4)
        ] + [
            Mock(
                dimensions={
                    "metric": "rmse",
                    "statistic": "mean",
                    "source_id": "model-outlier",
                    "kind": "model",
                },
                value=1000.0,
                id=100,
            )
        ]

        annotated, outlier_count = detect_outliers_in_scalar_values(mock_values, factor=3.0, min_n=4)
        by_id = {item.value.id: item for item in annotated}

        assert by_id[100].is_outlier is True
        assert outlier_count == 1
