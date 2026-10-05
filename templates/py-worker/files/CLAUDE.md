# acme

A Python background worker, generated from the stacks `py-worker` template
(`stack.json` records which features it has). It consumes the BullMQ jobs a
Node API produces, for work that belongs in Python: data processing, ML,
scientific libraries.
<!-- @feature:start database -->
It reads and writes the API's own Postgres database.
<!-- @feature:end -->

## Commands

```sh
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python worker.py      # run every worker until SIGINT/SIGTERM
.venv/bin/python -m compileall -q -x '/\.venv/' .   # the syntax check CI-style
```

`requirements.txt` is fully pinned: add a dependency with its exact version.
There is no test or lint setup yet.

## Layout

- `worker.py`: creates every worker, waits for a signal, closes them.
- `config.py`: one dataclass per settings group, filled from the environment
  in `Config.__new__`; read it as `CONFIG.env.<group>.<field>`.
- `workers/<name>/process.py`: one job handler per queue.
- `utils/worker.py`: `create_worker`, `create_logger`, `JobUtil`.
- `utils/logger.py`: rotating file logs under `$HOME_PATH/logs/` plus stdout.
<!-- @feature:start database -->
- `utils/db.py`: `DB()`, a SQLAlchemy session. `models/`: the ORM models,
  over `Base` and the column types in `models/mixins.py`.
<!-- @feature:end -->
<!-- @feature:start temporal -->
- `temporal/`: `workflows.py` and `activities.py`; `utils/temporal.py`
  registers them.
<!-- @feature:end -->

## Rules

- **Queue names and Redis must match the producer's.** The queue name is the
  string passed to `create_worker` in `worker.py`; it must be exactly the
  API's `QueueModule.register('<name>')`. A mismatch waits forever, silently.
- **Raise on failure.** A handler that raises is retried with the producer's
  `attempts` / `backoff`; one that swallows an error is marked done.
- **Config is plain.** A new variable is a dataclass field, an `os.getenv` in
  `Config.__new__` with a safe default, and a commented line in
  `.env.example`. `HOME_PATH` must be absolute.
<!-- @feature:start database -->
- **The API owns the database.** Models here are written by hand to match the
  API's Prisma schema; nothing checks they agree, so change them together.
  Never create tables, enums or migrations from Python. Enums bind to the
  existing Postgres type with `e(...)` in `models/enums.py`
  (`create_type=False` is load-bearing).
- **Close what you open.** A handler that uses `DB()` passes it to
  `util.finalize(db)`, which closes it.
<!-- @feature:end -->
<!-- @feature:start temporal -->
- **Workflows are deterministic, activities idempotent.** Use
  `workflow.now()` and `workflow.random()`; every side effect is an activity.
  `TEMPORAL_TASK_QUEUE` (default `python`) must not be the Node worker's queue:
  a workflow type a worker does not know fails and retries.
<!-- @feature:end -->

## Skills

- `add-worker`: a new job handler for a queue the API produces to.
- `add-model`: an ORM model mirroring one of the API's tables. <!-- @feature database -->
- `add-workflow`: a Temporal workflow and its activities. <!-- @feature temporal -->
