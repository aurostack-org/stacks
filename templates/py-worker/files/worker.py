import os
from bullmq import Worker
import asyncio
import signal
from utils.logger import Logger
from utils.worker import create_worker
from utils.telemetry import setup_telemetry, shutdown_telemetry  # @feature telemetry
from utils.temporal import create_temporal_worker  # @feature temporal

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
    # @feature:start temporal
    temporal_worker = await create_temporal_worker()
    temporal_run = asyncio.create_task(temporal_worker.run())
    # If the Temporal worker stops on its own (a fatal error), stop everything.
    temporal_run.add_done_callback(lambda _: shutdown_event.set())
    # @feature:end

    logger.info("Workers started and waiting for jobs.")
    try:
        await shutdown_event.wait()
    finally:
        logger.info("Cleaning up workers...")
        # Close workers gracefully
        await hello.close()
        # @feature:start temporal
        # Stops polling and waits for running activities to finish.
        if not temporal_run.done():
            await temporal_worker.shutdown()
        await temporal_run
        # @feature:end
        logger.info("Workers shut down successfully.")
        shutdown_telemetry()  # @feature telemetry

if __name__ == "__main__":
    asyncio.run(main())
