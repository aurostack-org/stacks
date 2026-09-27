from temporalio import activity


@activity.defn
async def greet(name: str) -> str:
    """
    Activities do the real work: I/O, database writes, calls to other
    services. Temporal retries a failed activity on its own (per the retry
    policy set in the workflow), so raise on failure and make each one safe to
    run twice.
    """
    activity.logger.info("Greeting %s", name)
    return f"Hello, {name}!"
