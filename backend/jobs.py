import asyncio
import os
from typing import AsyncIterator

from config import SBT_PROJECT_DIR

# { "main" | "train" | "stats": asyncio.subprocess.Process }
_running: dict[str, asyncio.subprocess.Process] = {}

_COMMANDS = {
    "main":  ["sbt", "runMain Main"],
    "train": ["sbt", "runMain TrainMain"],
    "stats": ["sbt", "runMain StatsMain"],
}

def running_jobs() -> list[str]:
    return [k for k, p in _running.items() if p.returncode is None]

async def run_job(kind: str) -> AsyncIterator[str]:
    """Async generator qui yield des events SSE (payloads str)."""
    if kind not in _COMMANDS:
        yield _sse("error", f"unknown kind: {kind}")
        return

    if kind in _running and _running[kind].returncode is None:
        yield _sse("error", f"{kind} already running")
        return

    cmd = _COMMANDS[kind]
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        cwd=SBT_PROJECT_DIR,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
        env={**os.environ, "JAVA_TOOL_OPTIONS": ""},
    )
    _running[kind] = proc

    yield _sse("start", kind)

    try:
        assert proc.stdout is not None
        async for raw in proc.stdout:
            line = raw.decode("utf-8", errors="replace").rstrip("\n")
            yield _sse("log", line)

        code = await proc.wait()
        yield _sse("done", str(code))
    except asyncio.CancelledError:
        # client disconnected — let the process finish on its own
        raise
    finally:
        # laisse l'entry, `running_jobs()` check `returncode` pour filtrer
        pass


def _sse(event: str, data: str) -> str:
    # Échapper les retours ligne dans `data` (SSE = une ligne par `data:`)
    safe = data.replace("\r", "").replace("\n", "\\n")
    return f"event: {event}\ndata: {safe}\n\n"