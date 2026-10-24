"""Load pages of execution groups through the climate-ref query builders."""

from typing import Literal

from sqlalchemy.orm import Session, selectinload

from climate_ref import models
from climate_ref.query import count, paginate, select_execution_group_ids, select_execution_groups
from climate_ref.results import ExecutionGroupFilter

# What ExecutionGroup.build touches beyond the diagnostic and provider the builder already joins,
# so a page of groups loads in a fixed number of queries.
_WITHOUT_OUTPUTS = (selectinload(models.ExecutionGroup.executions).selectinload(models.Execution.datasets),)
_WITH_OUTPUTS = (
    selectinload(models.ExecutionGroup.executions).selectinload(models.Execution.outputs),
    *_WITHOUT_OUTPUTS,
)


def load_execution_groups(  # noqa: PLR0913
    session: Session,
    filters: ExecutionGroupFilter,
    *,
    order: Literal["id", "recently_updated"] = "id",
    offset: int = 0,
    limit: int | None = None,
    include_outputs: bool = True,
    with_count: bool = True,
) -> tuple[list[models.ExecutionGroup], int | None]:
    """
    Load a page of the groups `filters` keeps, ready for `ExecutionGroup.build`, and how many match.

    Pass `with_count=False` to skip counting, which leaves the count `None`.

    `recently_updated` puts the most recently updated groups first.
    """
    stmt = select_execution_groups(filters).options(*(_WITH_OUTPUTS if include_outputs else _WITHOUT_OUTPUTS))
    if order == "recently_updated":
        stmt = stmt.order_by(None).order_by(
            models.ExecutionGroup.updated_at.desc(), models.ExecutionGroup.id.desc()
        )
    total_count = count(session, select_execution_group_ids(filters)) if with_count else None
    rows = session.execute(paginate(stmt, offset, limit)).tuples().all()
    return [group for group, _latest in rows], total_count
