"""
Database access over SQLAlchemy, with the connection settings from config
(DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME).

Usage:

from utils.db import DB

db = DB()
rows = db.session.execute(select(MyModel)).scalars().all()
db.session.commit()
db.close()

The models under models/ are hand-written to match the API's Prisma schema:
the API owns the tables and their migrations.
"""

from sqlalchemy import create_engine
from sqlalchemy.engine import URL, Connection
from sqlalchemy.orm import sessionmaker, Session

from config import CONFIG


class DB:
    def __init__(self):
        db = CONFIG.env.db
        # URL.create escapes the credentials, so a password with @, / or : in it
        # can't break the connection string.
        url = URL.create(
            "postgresql",
            username=db.user,
            password=db.password,
            host=db.host,
            port=db.port,
            database=db.name,
        )
        self._engine = create_engine(url).connect()
        Session = sessionmaker(bind=self.engine)
        self._session = Session()

    @property
    def engine(self) -> Connection:
        return self._engine

    @property
    def session(self) -> Session:
        return self._session

    def close(self, session: Session | None = None):
        """
        Closes the given session and the engine if it is not already closed.

        :param session: Pass a session object that needs to be closed. If a session object is provided, the method will close that session
        :type session: Session | None
        """
        session_to_close = session if session else self.session
        if not self.engine.closed:
            session_to_close.close()
            self.engine.close()
