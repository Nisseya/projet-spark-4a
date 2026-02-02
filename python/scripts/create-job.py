import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

import boto3
import psycopg2
from botocore.config import Config
from dotenv import load_dotenv
from psycopg2.extras import RealDictCursor
from tqdm import tqdm

load_dotenv()
# Public domain ASL clip (Internet Archive).
# See item "trilobiteASL" which lists Rights: Public Domain.
VIDEO_URL = "https://archive.org/download/trilobiteASL/trilobite.mp4"

# RustFS / S3 env (you already have these)
AWS_ACCESS_KEY_ID = os.environ["AWS_ACCESS_KEY_ID"]
AWS_SECRET_ACCESS_KEY = os.environ["AWS_SECRET_ACCESS_KEY"]
AWS_S3_BUCKET = os.environ["AWS_S3_BUCKET"]
AWS_S3_ENDPOINT = os.environ["AWS_S3_ENDPOINT"]
AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")

# Where to store the uploaded video in RustFS
RAW_VIDEO_PREFIX = os.environ.get("RAW_VIDEO_PREFIX", "raw-video")

# Postgres env (choose ONE style)
POSTGRES_HOST = os.environ.get("POSTGRES_HOST")

POSTGRES_PORT_STR = os.environ.get("POSTGRES_PORT")
if POSTGRES_PORT_STR is None:
    raise ValueError("No potgres port detected")
POSTGRES_PORT = int(POSTGRES_PORT_STR)
POSTGRES_DB = os.environ.get("POSTGRES_DB")
POSTGRES_USER = os.environ.get("POSTGRES_USER")
POSTGRES_PASSWORD = os.environ.get("POSTGRES_PASSWORD")

# Local temp file
TMP_DIR = Path(os.environ.get("TMP_DIR", "/tmp/asl_job_seed"))
TMP_DIR.mkdir(parents=True, exist_ok=True)


def make_s3_client():
    cfg = Config(
        s3={"addressing_style": "path"},
        retries={"max_attempts": 10, "mode": "standard"},
    )
    return boto3.client(
        "s3",
        endpoint_url=AWS_S3_ENDPOINT,
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
        region_name=AWS_REGION,
        config=cfg,
    )


def pg_connect():
    return psycopg2.connect(
        host=POSTGRES_HOST,
        port=POSTGRES_PORT,
        dbname=POSTGRES_DB,
        user=POSTGRES_USER,
        password=POSTGRES_PASSWORD,
        cursor_factory=RealDictCursor,
    )


def download_with_progress(url: str, out_path: Path, chunk_size: int = 1024 * 1024):
    req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urlopen(req) as r:
        total = r.headers.get("Content-Length")
        total = int(total) if total else None

        with open(out_path, "wb") as f:
            if total:
                bar = tqdm(
                    total=total, unit="B", unit_scale=True, desc="Downloading mp4"
                )
                bar = tqdm(
                    total=total, unit="B", unit_scale=True, desc="Downloading mp4"
                )
                bar = tqdm(unit="B", unit_scale=True, desc="Downloading mp4")

            while True:
                chunk = r.read(chunk_size)
                if not chunk:
                    break
                f.write(chunk)
                bar.update(len(chunk))

            bar.close()


def upload_file_to_rustfs(s3, local_path: Path, key: str):
    s3.upload_file(str(local_path), AWS_S3_BUCKET, key)


def insert_job(video_id: str, video_key: str) -> dict:
    # matches your schema: no progress column, timestamps default
    sql = """
    insert into jobs (video_id, video_key, status)
    values (%s, %s, %s)
    returning id, video_id, video_key, status, created_at, updated_at;
    """
    with pg_connect() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (video_id, video_key, "QUEUED_EXTRACT"))
            row = cur.fetchone()
        conn.commit()
    if row is None:
        return {}
    return dict(row)


def main():
    video_id = str(uuid.uuid4())
    local_mp4 = TMP_DIR / f"{video_id}.mp4"

    print(f"Video id: {video_id}")
    print(f"Downloading: {VIDEO_URL}")
    download_with_progress(VIDEO_URL, local_mp4)

    s3_key = f"{RAW_VIDEO_PREFIX}/{video_id}.mp4"
    print(f"Uploading to RustFS: s3://{AWS_S3_BUCKET}/{s3_key}")

    s3 = make_s3_client()
    upload_file_to_rustfs(s3, local_mp4, s3_key)

    # delete local mp4 after upload
    local_mp4.unlink(missing_ok=True)

    print("Inserting job into Postgres...")
    job = insert_job(video_id=video_id, video_key=s3_key)

    print("✅ Done")
    print("Job row:", job)


if __name__ == "__main__":
    main()
