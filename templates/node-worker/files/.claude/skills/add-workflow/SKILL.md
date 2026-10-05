---
name: add-workflow
description: Add a Temporal workflow and its activities to this worker — durable, multi-step work the API starts by name (onboarding sequences, provisioning, refunds, anything that waits or must not half-happen). Use when asked to "add a workflow", "make this durable", or when the API's TemporalService starts a workflow type this worker does not have yet.
---

# Add a Temporal workflow

The examples are `src/temporal/workflows/index.ts` (`example`) and
`src/temporal/activities/index.ts`. Use BullMQ (`add-worker`) instead when one
function call that can be retried from the top is enough.

1. **Activities first**, in `src/temporal/activities/index.ts`: each real side
   effect (a database write, an email, an HTTP call) is one exported async
   function.
   - Throw on failure; Temporal retries it with the workflow's retry policy.
   - Make it safe to run twice: an activity can be retried after it did its
     work but before Temporal recorded that.
   - Log with `log` from `@temporalio/activity`; sleep with
     `Context.current().sleep`, which is cancellation-aware.
   - They are registered automatically (`import * as activities`).

2. **The workflow**, exported from `src/temporal/workflows/index.ts`. The
   export name is the workflow type the API starts.

   ```ts
   const { sendWelcome, checkActivated, sendNudge } = proxyActivities<typeof activities>({
   	startToCloseTimeout: '1 minute',
   	retry: { maximumAttempts: 5 }
   });

   export async function onboarding(input: { userId: string }): Promise<void> {
   	await sendWelcome(input.userId);
   	await sleep('3 days');
   	if (!(await checkActivated(input.userId))) await sendNudge(input.userId);
   }
   ```

   - **Deterministic only**: no I/O, no `Date.now()`, no `Math.random()`, no
     imports that touch the network or filesystem. Use `sleep` and the
     workflow APIs; put everything else in an activity.
   - Inputs and outputs are plain JSON-serialisable values.

3. **Match the API**: the API starts it by name on `TEMPORAL_TASK_QUEUE`. That
   queue, `TEMPORAL_ADDRESS` and `TEMPORAL_NAMESPACE` must be the same on both
   sides, or the workflow waits forever unclaimed.

4. **Check**: `yarn typecheck && yarn lint`; run `yarn dev` with a local
   Temporal, start the workflow from the API, and follow it in the Temporal UI.
