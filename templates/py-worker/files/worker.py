import os
from bullmq import Worker
import asyncio
import signal
from utils.logger import Logger
from utils.worker import create_worker
from utils.telemetry import setup_telemetry, shutdown_telemetry  # @feature telemetry

# import worker processes
from workers.hello.process import hello_process
logger = Logger("worker")


async def main():
    setup_telemetry()  # @feature telemetry
    logger.info("Starting Python 3.14 Worker...")
    shutdown_event = asyncio.Event()
    loop = asyncio.get_running_loop()

    # Async signal handlers
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(
            sig,
            lambda s=sig: (
                logger.info(f"Signal {s} received, shutting down."),
                shutdown_event.set()
            ),
        )

    # Add workers
    hello = create_worker("hello", hello_process)

    logger.info("Workers started and waiting for jobs.")
    try:
        await shutdown_event.wait()
    finally:
        logger.info("Cleaning up workers...")
        # Close workers gracefully
        await hello.close()
        logger.info("Workers shut down successfully.")
        shutdown_telemetry()  # @feature telemetry

if __name__ == "__main__":
    asyncio.run(main())
