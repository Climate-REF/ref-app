import pytest
from sqlalchemy import func, select

from climate_ref import models
from climate_ref.database import Database
from ref_backend.core.mip_eras import (
    CMIP_ERAS,
    cmip_input_filter,
    cv_column,
    dataset_model_for,
)
from ref_backend.testing import test_ref_config as fixture_ref_config


@pytest.fixture(scope="module")
def session():
    return Database.from_config(fixture_ref_config(), run_migrations=False, read_only=True).session


def _count(session, facets) -> int:
    input_filter = cmip_input_filter(facets)
    if input_filter is None:
        return 0
    return session.scalar(select(func.count(models.Execution.id)).where(input_filter.execution_clause()))


def _a_source_id(session) -> str:
    cmip6 = dataset_model_for(CMIP_ERAS[0])
    return session.scalar(select(cv_column(cmip6, "source_id")).limit(1))


def test_no_facets_matches_every_execution_with_a_cmip_input(session):
    assert _count(session, {}) > 0


def test_an_unknown_era_matches_nothing(session):
    assert cmip_input_filter({"mip_era": "CMIP5"}) is None
    assert _count(session, {"mip_era": "CMIP5"}) == 0


def test_the_era_is_case_insensitive(session):
    assert _count(session, {"mip_era": "cmip6"}) == _count(session, {"mip_era": "CMIP6"}) > 0


def test_an_unknown_facet_is_ignored(session):
    assert _count(session, {"not_a_facet": "x"}) == _count(session, {})


def test_a_facet_only_the_other_era_carries_matches_nothing(session):
    assert cmip_input_filter({"mip_era": "CMIP6", "branding_suffix": "x"}) is None


def test_a_facet_one_era_carries_drops_the_other_era(session):
    cmip6 = dataset_model_for(CMIP_ERAS[0])
    table_id = session.scalar(select(cmip6.table_id).limit(1))
    assert _count(session, {"table_id": table_id}) == _count(
        session, {"mip_era": "CMIP6", "table_id": table_id}
    )
    assert _count(session, {"mip_era": "CMIP7", "table_id": table_id}) == 0


def test_a_comma_list_matches_any_of_its_values(session):
    source_id = _a_source_id(session)
    one = _count(session, {"source_id": source_id})
    assert one > 0
    assert _count(session, {"source_id": f"{source_id}, not-a-model"}) == one
    assert _count(session, {"source_id": "not-a-model,"}) == 0
