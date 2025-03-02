from sqlmodel import Session, create_engine, select

from app import crud
from ref_backend.core.config import settings
from ref_backend.models import User, UserCreate
from cmip_ref.database import Database
engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))

fr


# make sure all SQLModel models are imported (ref_backend.models) before initializing DB
# otherwise, SQLModel might fail to initialize relationships properly
# for more details: https://github.com/fastapi/full-stack-fastapi-template/issues/28



