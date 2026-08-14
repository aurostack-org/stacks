from bullmq import Job

from utils.worker import create_logger, JobUtil

logger = create_logger('hello')


async def hello_process(job: Job, job_token):
    """
    Job handler.

    Raising marks the job failed and lets BullMQ retry it according to the
    producer's attempts/backoff settings — so raise on a genuine failure rather
    than swallowing it and returning normally.
    """
    util = JobUtil(job, logger)
    logger.info(f"Job[{job.id}]: processing... (token={job_token})")
    await util.process_log("Processing started")

    # Do the work here.

    await util.finalize()
