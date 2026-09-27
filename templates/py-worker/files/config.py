import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()


@dataclass
class ProjectPath:
    home: str
    input: str
    output: str
    logs: str


@dataclass
class DB:
    host: str
    port: int
    user: str
    password: str
    name: str


@dataclass
class Redis:
    host: str
    port: int
    user: str | None
    password: str | None


# @feature:start temporal
@dataclass
class TemporalTLS:
    # PEM; all empty means plaintext (the local dev server).
    ca: str
    cert: str
    key: str


@dataclass
class Temporal:
    address: str
    namespace: str
    task_queue: str
    tls: TemporalTLS
# @feature:end


@dataclass
class Env:
    path: ProjectPath
    db: DB
    redis: Redis
    temporal: Temporal  # @feature temporal


class Config:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            instance = super().__new__(cls)

            home = os.getenv('HOME_PATH')
            if not home:
                raise ValueError("HOME_PATH environment variable is not set")

            instance._env = Env(
                path=ProjectPath(
                    home=home,
                    input=os.path.join(home, 'input'),
                    output=os.path.join(home, 'output'),
                    logs=os.path.join(home, 'logs')
                ),
                db=DB(
                    host=os.getenv('DB_HOST', ''),
                    port=int(os.getenv('DB_PORT', 0)),
                    user=os.getenv('DB_USER', ''),
                    password=os.getenv('DB_PASSWORD', ''),
                    name=os.getenv('DB_NAME', '')
                ),
                redis=Redis(
                    host=os.getenv('REDIS_HOST', ''),
                    port=int(os.getenv('REDIS_PORT', 0)),
                    user=os.getenv('REDIS_USER'),
                    password=os.getenv('REDIS_PASSWORD')
                ),
                # @feature:start temporal
                temporal=Temporal(
                    address=os.getenv('TEMPORAL_ADDRESS') or 'localhost:7233',
                    namespace=os.getenv('TEMPORAL_NAMESPACE') or 'default',
                    task_queue=os.getenv('TEMPORAL_TASK_QUEUE') or 'python',
                    tls=TemporalTLS(
                        ca=os.getenv('TEMPORAL_TLS_CA', ''),
                        cert=os.getenv('TEMPORAL_TLS_CERT', ''),
                        key=os.getenv('TEMPORAL_TLS_KEY', '')
                    )
                ),
                # @feature:end
            )

            cls._instance = instance

        return cls._instance

    @property
    def env(self) -> Env:
        return self._env

    @property
    def path(self) -> ProjectPath:
        return self._env.path

    def join(self, *args):
        return os.path.join(self._env.path.home, *args)


CONFIG = Config()
