from __future__ import annotations

from pathlib import Path
import shutil
import zipfile
import os
import json
import mimetypes
import hashlib
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed

from dotenv import load_dotenv
load_dotenv()

import boto3
from botocore.config import Config
from kaggle.api.kaggle_api_extended import KaggleApi


# -----------------------------
# Config
# -----------------------------
DATASET = "grassknoted/asl-alphabet"

PROJECT_ROOT = Path(__file__).resolve().parents[3]
TMP_DIR = PROJECT_ROOT / "data" / ".kaggle_tmp"

RAW_TRAIN_DIRNAME = "asl_alphabet_train"
RAW_TEST_DIRNAME = "asl_alphabet_test"

S3_BUCKET = os.environ["AWS_S3_BUCKET"]
AWS_ACCESS_KEY_ID = os.environ["AWS_ACCESS_KEY_ID"]
AWS_SECRET_ACCESS_KEY = os.environ["AWS_SECRET_ACCESS_KEY"]

# RustFS / MinIO-style endpoint (mets ça dans ton .env si tu veux)
S3_ENDPOINT_URL = os.getenv("AWS_S3_ENDPOINT", "http://localhost:9000")
S3_REGION = os.getenv("AWS_REGION", "us-east-1")

# path-style est souvent nécessaire sur RustFS/MinIO
S3_FORCE_PATH_STYLE = os.getenv("AWS_S3_FORCE_PATH_STYLE", "true").lower() in ("1", "true", "yes")

# Manifest output
MANIFEST_PATH = PROJECT_ROOT / "data" / "asl_manifest.json"


# -----------------------------
# Helpers
# -----------------------------
def unwrap_single_dir(p: Path) -> Path:
    children = list(p.iterdir())
    if len(children) == 1 and children[0].is_dir():
        return children[0]
    return p


def file_md5_hex(p: Path, chunk_size: int = 1024 * 1024) -> str:
    h = hashlib.md5()
    with p.open("rb") as f:
        while True:
            b = f.read(chunk_size)
            if not b:
                break
            h.update(b)
    return h.hexdigest()


def make_s3_client():
    cfg = Config(
        s3={"addressing_style": "path" if S3_FORCE_PATH_STYLE else "virtual"},
        retries={"max_attempts": 10, "mode": "standard"},
    )
    return boto3.client(
        "s3",
        endpoint_url=S3_ENDPOINT_URL,
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
        region_name=S3_REGION,
        config=cfg,
    )


def iter_images(root: Path):
    # Dataset ASL Alphabet: root/<LABEL>/*.jpg
    for label_dir in sorted([p for p in root.iterdir() if p.is_dir()]):
        label = label_dir.name
        for img in sorted(label_dir.glob("*.jpg")):
            yield label, img


def upload_one(s3, local_path: Path, key: str) -> dict:
    ctype, _ = mimetypes.guess_type(local_path.name)
    if not ctype:
        ctype = "application/octet-stream"

    md5 = file_md5_hex(local_path)  # utile pour vérifier / debug

    extra = {
        "ContentType": ctype,
        "Metadata": {
            "md5": md5,
        },
    }

    s3.upload_file(
        Filename=str(local_path),
        Bucket=S3_BUCKET,
        Key=key,
        ExtraArgs=extra,
    )

    return {
        "bucket": S3_BUCKET,
        "key": key,
        "size_bytes": local_path.stat().st_size,
        "content_type": ctype,
        "md5": md5,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
    }


# -----------------------------
# Main
# -----------------------------
def main():
    # 1) Download Kaggle zip
    if TMP_DIR.exists():
        shutil.rmtree(TMP_DIR)
    TMP_DIR.mkdir(parents=True)

    api = KaggleApi()
    api.authenticate()

    api.dataset_download_files(
        DATASET,
        path=str(TMP_DIR),
        unzip=False,
        quiet=False,
    )

    # 2) Unzip all
    for z in TMP_DIR.glob("*.zip"):
        with zipfile.ZipFile(z) as f:
            f.extractall(TMP_DIR)
        z.unlink()

    raw_train = unwrap_single_dir(TMP_DIR / RAW_TRAIN_DIRNAME)
    raw_test = unwrap_single_dir(TMP_DIR / RAW_TEST_DIRNAME)

    if not raw_train.exists() or not raw_test.exists():
        raise RuntimeError(f"Expected {RAW_TRAIN_DIRNAME} and {RAW_TEST_DIRNAME} in {TMP_DIR}")

    # 3) S3 client + bucket
    s3 = make_s3_client()

    # 4) Upload with manifest
    manifest = {
        "dataset": DATASET,
        "bucket": S3_BUCKET,
        "endpoint": S3_ENDPOINT_URL,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "files": [],  # list of per-file dicts
    }

    tasks = []
    max_workers = int(os.getenv("UPLOAD_WORKERS", "16"))

    def schedule_split(split_name: str, split_root: Path):
        for label, img in iter_images(split_root):
            # key: train/A/A01.jpg etc
            key = f"{split_name}/{label}/{img.name}"
            meta = {
                "split": split_name,
                "label": label,
                "filename": img.name,
                "local_path": str(img),
                "s3_key": key,
            }
            yield img, key, meta

    # Schedule uploads (train + test)
    all_items = list(schedule_split("train", raw_train)) + list(schedule_split("test", raw_test))

    with ThreadPoolExecutor(max_workers=max_workers) as ex:
        fut_to_meta = {}
        for img, key, meta in all_items:
            fut = ex.submit(upload_one, s3, img, key)
            fut_to_meta[fut] = meta

        for fut in as_completed(fut_to_meta):
            meta = fut_to_meta[fut]
            res = fut.result()
            manifest["files"].append({**meta, **res})

    # optional: sort manifest by split/label/name for stability
    manifest["files"].sort(key=lambda x: (x["split"], x["label"], x["filename"]))

    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    # 5) Cleanup tmp
    shutil.rmtree(TMP_DIR)

    print("✅ Uploaded to RustFS (S3)")
    print(f"  endpoint → {S3_ENDPOINT_URL}")
    print(f"  bucket   → {S3_BUCKET}")
    print(f"✅ Manifest written")
    print(f"  {MANIFEST_PATH.resolve()}")
    print(f"  files: {len(manifest['files'])}")


if __name__ == "__main__":
    main()
