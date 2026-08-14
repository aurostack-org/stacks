from __future__ import annotations

import enum
from sqlalchemy.dialects.postgresql import ENUM


def e(cls: type[enum.Enum]) -> ENUM:
    """
    Bind a Python enum to an existing Postgres enum type.

    `create_type=False` is load-bearing: the type is owned by the API's
    migrations, and letting SQLAlchemy try to create it here would fail against
    a real database or, worse, race the migration.

    `values_callable` sends the enum *values* rather than its member names,
    which is what the column actually stores.
    """
    return ENUM(
        cls,
        name=cls.__name__,
        schema="public",
        create_type=False,
        values_callable=lambda enum_cls: [member.value for member in enum_cls]
    )


class Gender(enum.Enum):
    MALE = 'male'
    FEMALE = 'female'


GenderEnum = e(Gender)
