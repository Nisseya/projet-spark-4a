import psycopg
from contextlib import contextmanager
from config import PG_DSN

@contextmanager
def conn():
    with psycopg.connect(PG_DSN, row_factory=psycopg.rows.dict_row) as c:
        yield c

def list_videos(user_id: str):
    with conn() as c, c.cursor() as cur:
        cur.execute("""
            SELECT id, name, extension, status, created_at, updated_at, error
              FROM videos
             WHERE created_by = %s
             ORDER BY created_at DESC
        """, (user_id,))
        return cur.fetchall()

def get_video(video_id: str):
    with conn() as c, c.cursor() as cur:
        cur.execute("SELECT * FROM videos WHERE id = %s", (video_id,))
        return cur.fetchone()

def create_video(video_id: str, user_id: str, name: str, extension: str, video_key: str):
    with conn() as c, c.cursor() as cur:
        cur.execute("""
            INSERT INTO videos (id, created_by, name, extension, video_key, status)
            VALUES (%s, %s, %s, %s, %s, 'UPLOAD_STARTED')
        """, (video_id, user_id, name, extension, video_key))

def mark_upload_complete(video_id: str):
    with conn() as c, c.cursor() as cur:
        cur.execute("""
            UPDATE videos SET status='UPLOAD_COMPLETE', updated_at=now()
             WHERE id=%s
        """, (video_id,))