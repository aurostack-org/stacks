---
name: add-model
description: Add a SQLAlchemy model to this Python worker that mirrors one of the API's Prisma tables, so a job handler can read or write it. Use when a handler needs data from a table the worker has no model for, or when asked to "map the X table", "add a model for Y", or after the API's schema changes.
---

# Mirror an API table

The API owns the table: its Prisma schema is the source of truth and its
migrations create it. A model here only describes it. Never create or alter
tables, enums or columns from Python.

1. **Read the API's model** in its `prisma/schema/*.prisma`. Note the table
   name (`@@map("…")`), each column's database name (`@map("…")`), types,
   nullability, the primary key and its default.

2. **Write the model** in `models/<name>.py` over `Base` from
   `models/mixins.py`:

   ```python
   from __future__ import annotations

   from sqlalchemy import Text, ForeignKey
   from sqlalchemy.orm import Mapped, mapped_column

   from models.mixins import Base, TimestampMixin, text_pk


   class Report(Base, TimestampMixin):
       __tablename__ = "reports"            # the Prisma @@map

       id: Mapped[text_pk]                    # Prisma cuid() ids are text
       account_id: Mapped[str] = mapped_column("account_id", Text, ForeignKey("accounts.id"))
       title: Mapped[str] = mapped_column(Text)
       summary: Mapped[str | None] = mapped_column(Text, nullable=True)
   ```

   - Column names are the database names (`@map`), not the Prisma field names.
   - Use the annotated types in `models/mixins.py` (`text_pk`, `uuid_pk`,
     `dcml`, `flt`…) and its timestamp mixins where they match.
   - Map only the columns the worker uses; leaving one out is fine, adding
     one the table lacks is not.
   - An enum column binds to the existing Postgres type: declare the Python
     enum and `XEnum = e(X)` in `models/enums.py`, with the values the API's
     `enum.prisma` stores.
   - `@repr(...)` and `@to_dict(...)` from `models/decorators.py` are there
     for logging and JSON.

3. **Use it** in a handler through `DB()` from `utils/db.py`:
   `db.session.execute(select(Report).where(...)).scalars().all()`, then
   `db.session.commit()` after writes, and `util.finalize(db)` to close it.

4. **Check** against a real database: run a handler that selects from the
   table. A wrong column name fails at the first query, not at import.

When the API's schema changes, update the model in the same change as the
handler that depends on it; nothing else will notice the drift.
