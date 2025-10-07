from unittest.mock import Mock

from ref_backend.core.outliers import detect_outliers_in_scalar_values, flag_outliers_iqr


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
