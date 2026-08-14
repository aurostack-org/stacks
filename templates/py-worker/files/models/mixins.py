from __future__ import annotations

from typing_extensions import Annotated
from sqlalchemy import DateTime, Integer, BigInteger, Text, DECIMAL, Float
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from datetime import datetime
from uuid import UUID, uuid4
from decimal import Decimal


int_pk = Annotated[int, mapped_column(
    Integer, primary_key=True, autoincrement=True)]
bigint_pk = Annotated[int, mapped_column(
    BigInteger, primary_key=True, autoincrement=True)]
text_pk = Annotated[str, mapped_column(Text, primary_key=True)]
uuid_pk = Annotated[UUID, mapped_column(
    PgUUID(as_uuid=True), primary_key=True, default=uuid4
)]
dcml = Annotated[Decimal, mapped_column(DECIMAL(18, 4))]
dcml_nl = Annotated[
    Decimal | None,
    mapped_column(DECIMAL(18, 4), nullable=True)
]
dcml_20 = Annotated[Decimal, mapped_column(DECIMAL(20, 4))]
dcml_20_nl = Annotated[
    Decimal | None,
    mapped_column(DECIMAL(20, 4), nullable=True)
]
flt = Annotated[float, mapped_column(Float)]
flt_nl = Annotated[float | None, mapped_column(Float, nullable=True)]


class Base(DeclarativeBase):
    """Base for all ORM models."""

    pass


class CreatedAtMixin:
    """Adds a `created_at` column that auto-updates on creation."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.now)


class UpdatedAtMixin:
    """Adds an `updated_at` column that auto-updates on modification."""

    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        default=datetime.now,
        onupdate=datetime.now,
        nullable=True,
    )


class TimestampMixin(CreatedAtMixin, UpdatedAtMixin):
    """Combines created_at + updated_at."""

    pass
