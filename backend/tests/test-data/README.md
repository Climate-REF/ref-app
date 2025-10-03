# Test Data

## `tests.integration.test_cmip7_aft/`

This directory contains example results generated from the Climate REF `tests.integration.test_cmip7_aft` integration test.
The results from this test are manually copied into this directory from the test artifacts on GitHub,
and the unneeded files are automatically excluded via gitignore (logs, scratch, database backups).

The database contains the absolute paths used by the GitHub runner for the datasets
(`/home/runner/work/climate-ref/climate-ref/tests/test-data/sample-data/`).
This might cause issues in the future, but we aren't at that point yet.
