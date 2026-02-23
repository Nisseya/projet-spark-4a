import uuid

from fastapi import FastAPI, Query, Body
from fastapi.responses import JSONResponse

from dotenv import load_dotenv

from .rustfs import load_rustfs_from_env
from .db import Database



load_dotenv()

app = FastAPI(title="RustFS Presign API")
app.state.db = Database()
store = load_rustfs_from_env()


@app.get("/post_url")
def get_presigned_put_url(
    user_id: str = Query(...),
    video_name: str = Query(...),
):
    video_id = uuid.uuid4().hex
    key = f"raw_video/{user_id}/{video_id}/source.mp4"

    upload_url = store.presigned_put_url(
        key=key,
        expires_in_seconds=900,
        content_type="video/mp4",
    )
    
    name, extension = video_name.split(".",1)
    
    app.state.db.execute(
        """INSERT INTO videos (id, name, extension, video_key, status)
        VALUES (%s,%s,%s,%s,'UPLOAD_STARTED')""",
        (video_id,name, extension, key)
    )

    return JSONResponse(
        {
            "video_id": video_id,
            "key": key,
            "upload_url": upload_url,
            "video_name": video_name,
            "content_type": "video/mp4",
        }
    )
    
from pydantic import BaseModel

class CompleteRequest(BaseModel):
    video_id: str

@app.post("/complete")
def complete_video(payload: CompleteRequest):
    app.state.db.execute(
        """UPDATE videos
        SET status = 'UPLOAD_COMPLETE'
        WHERE id = %s""",
        (payload.video_id,)
    )
    return {"status": "ok"}