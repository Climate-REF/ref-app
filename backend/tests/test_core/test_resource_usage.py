from sqlalchemy import select

from climate_ref import models
from climate_ref.results import ResourceFilter
from ref_backend.core.resource_usage import resource_usage


def test_resource_usage_counts_retracted_executions(writable_session, writable_reader):
    """A retracted execution still used the resources it recorded."""
    everything = ResourceFilter(include_retracted=True)
    before = resource_usage(writable_reader, everything)
    assert before is not None

    timed = writable_session.scalars(
        select(models.Execution).where(models.Execution.wall_seconds.isnot(None)).limit(1)
    ).one()
    timed.retracted = True
    writable_session.commit()

    assert resource_usage(writable_reader, everything) == before


def test_resource_usage_is_none_without_a_timed_execution(writable_reader):
    assert resource_usage(writable_reader, ResourceFilter(diagnostic_slug="no-such-diagnostic")) is None
