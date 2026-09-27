from dataclasses import dataclass
from datetime import timedelta

from temporalio import workflow
from temporalio.common import RetryPolicy

# Workflows run in a sandbox that re-imports modules for each run; activities
# are only referenced here, never executed, so pass them straight through.
with workflow.unsafe.imports_passed_through():
    from temporal.activities import greet


@dataclass
class ExampleInput:
    name: str


@workflow.defn(name="example")
class Example:
    """
    Workflows orchestrate; activities act. This code is replayed from history
    to rebuild state, so it must be deterministic: no I/O, no datetime.now() or
    random of its own (use workflow.now() and workflow.random()), nothing that
    touches the network or filesystem. Anything like that belongs in an
    activity.
    """

    @workflow.run
    async def run(self, input: ExampleInput) -> str:
        # A durable timer: survives worker restarts and deploys, for as long
        # as you like (timedelta(days=30) works the same way).
        await workflow.sleep(timedelta(seconds=1))
        return await workflow.execute_activity(
            greet,
            input.name,
            start_to_close_timeout=timedelta(minutes=1),
            retry_policy=RetryPolicy(maximum_attempts=5),
        )
