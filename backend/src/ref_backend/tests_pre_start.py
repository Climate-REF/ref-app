import logging

from tenacity import after_log, before_log, retry, stop_after_attempt, wait_fixed

from climate_ref.database import Database
from ref_backend.core.ref import get_database

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

max_tries = 60 * 5  # 5 minutes
wait_seconds = 1


@retry(
    stop=stop_after_attempt(max_tries),
    wait=wait_fixed(wait_seconds),
    before=before_log(logger, logging.INFO),
    after=after_log(logger, logging.WARN),
)
def init(db_engine: Database) -> None:
    try:
        # Try to create session to check if DB is awake
        db_engine.session.select(1)
    except Exception as e:
        logger.error(e)
        raise e


def main() -> None:
    logger.info("Initializing service")

    init(get_database())
    logger.info("Service finished initializing")


if __name__ == "__main__":
    main()
