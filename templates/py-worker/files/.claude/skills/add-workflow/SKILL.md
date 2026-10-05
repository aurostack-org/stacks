---
name: add-workflow
description: Add a Temporal workflow and its activities to this Python worker — durable, multi-step work in Python that the API starts by name. Use when asked to "add a workflow", "make this durable", or when the API's TemporalService starts a workflow type on this worker's task queue.
---

# Add a Temporal workflow

The examples are `Example` in `temporal/workflows.py` and `greet` in
`temporal/activities.py`. Use a BullMQ handler (`add-worker`) instead when one
call that can be retried from the top is enough.

1. **Activities**, in `temporal/activities.py`: one `@activity.defn` async
   function per side effect (a query, a file, an HTTP call, a model run).
   Raise on failure; make each safe to run twice; log with `activity.logger`.

2. **The workflow**, in `temporal/workflows.py`:

   ```python
   @dataclass
   class ScoreInput:
       dataset_id: str


   @workflow.defn(name="score-dataset")
   class ScoreDataset:
       @workflow.run
       async def run(self, input: ScoreInput) -> str:
           path = await workflow.execute_activity(
               fetch_dataset, input.dataset_id,
               start_to_close_timeout=timedelta(minutes=10),
               retry_policy=RetryPolicy(maximum_attempts=5),
           )
           return await workflow.execute_activity(
               score, path, start_to_close_timeout=timedelta(hours=1),
           )
   ```

   - `name=` is the workflow type the API starts.
   - Import activities inside `with workflow.unsafe.imports_passed_through():`.
   - **Deterministic only**: no I/O, no `datetime.now()` or `random`; use
     `workflow.now()`, `workflow.random()` and `workflow.sleep()`.
   - Inputs and outputs are dataclasses or plain JSON values.

3. **Register both** in `utils/temporal.py`: add the class to `workflows=[…]`
   and each activity to `activities=[…]`. Unlike the Node worker, nothing is
   picked up automatically.

4. **Match the API**: it starts the workflow by name on this worker's
   `TEMPORAL_TASK_QUEUE` (default `python`), never the Node worker's queue.

5. **Check**: `.venv/bin/python -m compileall -q -x '/\.venv/' .`, run
   `worker.py` with a local Temporal, start the workflow from the API, and
   follow it in the Temporal UI.
