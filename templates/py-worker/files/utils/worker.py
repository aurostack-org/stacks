from typing import Callable
from bullmq import Worker, Job
from urllib.parse import urlparse, quote, urlencode

from config import CONFIG, Redis
from utils.db import DB
from utils.logger import Logger


def build_redis_url(options: Redis):
    # Treat empty strings like missing values
    user = options.user or None
    password = options.password or None
    host = options.host
    port = options.port

    if user and password:
        auth = f"{quote(user, safe='')}:{quote(password, safe='')}@"
    elif user:
        auth = f"{quote(user, safe='')}@"
    elif password:
        # Password-only auth keeps empty username before colon
        auth = f":{quote(password, safe='')}@"
    else:
        auth = ""

    return f"redis://{auth}{host}:{port}"


def create_worker(queue_name: str, process_function: Callable, concurrency: int = 1) -> Worker:
    """
    Create a BullMQ Worker connected to the specified Redis instance.

    Args:
        queue_name: Name of the queue to connect to.
        process_function: The function to process jobs.

    Returns:
        An instance of BullMQ Worker.
    """
    connection = build_redis_url(CONFIG.env.redis)
    worker = Worker(
        queue_name,
        process_function,
        {
            "connection": connection,
            "autorun": True,
            "concurrency": concurrency
        })
    return worker


def create_logger(name: str) -> Logger:
    """
    Create a Logger instance.

    Args:
        name: The name of the logger (and log file).

    Returns:
        An instance of Logger for a worker.
    """
    return Logger(name, "workers")


class JobUtil:
    def __init__(self, job: Job, logger: Logger):
        self._job = job
        self._logger = logger

    async def process_log(self, message: str, progress: int | None = None):
        if progress is not None:
            await self._job.updateProgress(progress)
        await self._job.log(message)

    async def finalize(self, db: DB | None = None):
        if db:
            db.close()
        await self._job.updateProgress(100)
        self._logger.info(f"Job[{self._job.id}]: completed")
