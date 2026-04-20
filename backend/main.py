import uuid
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

import db
from s3 import presign_get, presign_put, find_part_file
from jobs import run_job, running_jobs
from config import S3_BUCKET

app = FastAPI(title="Spark Pipeline Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Videos ----------

class CreateVideoBody(BaseModel):
    user_id: str
    name: str
    extension: str
    content_type: str = "video/mp4"

@app.post("/api/videos")
def create_video(body: CreateVideoBody):
    video_id = str(uuid.uuid4())
    video_key = f"videos/{body.user_id}/{video_id}.{body.extension}"
    db.create_video(video_id, body.user_id, body.name, body.extension, video_key)
    upload_url = presign_put(video_key, body.content_type)
    return {"video_id": video_id, "upload_url": upload_url}

@app.post("/api/videos/{video_id}/complete")
def complete_video(video_id: str):
    db.mark_upload_complete(video_id)
    return {"ok": True}

@app.get("/api/videos")
def list_videos(user_id: str):
    return db.list_videos(user_id)

@app.get("/api/videos/{video_id}")
def get_video(video_id: str):
    row = db.get_video(video_id)
    if not row:
        raise HTTPException(404, "video not found")
    video_url = presign_get(row["video_key"])
    ann_key = find_part_file(f"stats/annotations/user_id={row['created_by']}/video_id={video_id}/")
    ann_url = presign_get(ann_key) if ann_key else None
    return {**row, "video_url": video_url, "annotations_url": ann_url}

# ---------- Stats ----------

_STATS_PATHS = {
    "global":      "stats/global/",
    "per-user":    "stats/per-user/",
    "per-video":   "stats/per-video/",
}
_TOPS_PATHS = {
    "users-by-video-count": "stats/top/users-by-video-count/",
    "users-by-duration":    "stats/top/users-by-duration/",
    "longest-videos":       "stats/top/longest-videos/",
    "letters":              "stats/top/letters/",
}

def _presigned_part(prefix: str):
    key = find_part_file(prefix)
    if not key:
        raise HTTPException(404, f"no file under {prefix} — run StatsMain first")
    return {"url": presign_get(key)}

@app.get("/api/stats/{name}")
def stats_main(name: str):
    if name not in _STATS_PATHS:
        raise HTTPException(404, "unknown stats name")
    return _presigned_part(_STATS_PATHS[name])

@app.get("/api/stats/tops/{kind}")
def stats_tops(kind: str):
    if kind not in _TOPS_PATHS:
        raise HTTPException(404, "unknown top kind")
    return _presigned_part(_TOPS_PATHS[kind])

@app.get("/api/stats/annotations/{video_id}")
def stats_annotations(video_id: str):
    # user_id vient du row video
    row = db.get_video(video_id)
    if not row:
        raise HTTPException(404, "video not found")
    return _presigned_part(
        f"stats/annotations/user_id={row['created_by']}/video_id={video_id}/"
    )

# ---------- Admin (SSE) ----------

@app.post("/api/admin/run/{kind}")
async def admin_run(kind: str):
    return StreamingResponse(
        run_job(kind),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )

@app.get("/api/admin/status")
def admin_status():
    return {"running": running_jobs()}