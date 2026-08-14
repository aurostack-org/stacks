"""
@File: db.py
@Version: 1.0

Database wrapper to manage PostgreSQL connections using SQLAlchemy

DB('my_database') will create a connection to the specified PostgreSQL database
using credentials from the .env file (user, password, host, port).

Usage example:

from utils import DB

db = DB('my_database')

# Read data
df = db.read_sql('SELECT * FROM my_table')

# Write data
db.write_sql(df, 'my_table', if_exists='append')

# Use engine or session without having to create a new connection or variable
db.session.query(...)
db.engine.execute(...)
# ... perform operations ...
db.session.commit()

# Close the connection when done
db.close()

"""

from sqlalchemy import create_engine
from sqlalchemy.engine import Connection
from sqlalchemy.orm import sessionmaker, Session

from config import CONFIG


class DB:
    def __init__(self):
        db = CONFIG.env.db
        self._engine = create_engine(
            f"postgresql://{db.user}:{db.password}@{db.host}:{db.port}/{db.name}"
        ).connect()
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
