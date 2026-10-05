---
name: add-worker
description: Add a BullMQ job handler to this Python worker for a queue the Node API produces to — the handler, its registration and its shutdown. Use when asked to "process X in Python", "consume the Y queue", "add a job handler", or when the API gains a QueueModule.register('<name>') this worker should run.
---

# Add a job handler

The example is `workers/hello/process.py`, created in `worker.py` as
`create_worker("hello", hello_process)`. Copy its shape.

1. **The handler**, in `workers/<name>/process.py`:

   ```python
   from bullmq import Job

   from utils.worker import create_logger, JobUtil

   logger = create_logger('reports')


   async def reports_process(job: Job, job_token):
       util = JobUtil(job, logger)
       account_id = job.data["accountId"]
       await util.process_log(f"Building report for {account_id}", 10)
       # …the work; raise on a genuine failure so BullMQ retries it
       await util.finalize()
   ```

   - `job.data` is the JSON the API enqueued; name the producer in a docstring
     so the payload's shape can be found.
   - Raise rather than return on failure. Retries and backoff are set by the
     producer (`attempts`, `backoff` on `queue.add`), not here.
   - Make it safe to run twice: a retry re-runs it from the top.
   - `util.process_log(message, progress)` writes to the job's log and its
     progress; `util.finalize(db)` closes a `DB()` you opened and marks 100%.
   - Long CPU-bound work blocks the event loop: run it with
     `await asyncio.to_thread(fn, ...)`.

2. **Register it** in `worker.py`, in three places:
   - import the handler beside `hello_process`;
   - `reports = create_worker("reports", reports_process)` beside the others.
     The name is exactly the API's `QueueModule.register('reports')`;
     `create_worker` also takes `concurrency=` (default 1);
   - `await reports.close()` in the `finally` block, so shutdown waits for
     its active job.

3. **Check**: `.venv/bin/python -m compileall -q -x '/\.venv/' .`, then run
   `.venv/bin/python worker.py` against the API's Redis and enqueue a job from
   the API.
