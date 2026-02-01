import json
import os
import random
import shutil
import zipfile
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable, Iterator

import boto3
import pyarrow as pa
import pyarrow.parquet as pq
from botocore.config import Config
from dotenv import load_dotenv
from tqdm import tqdm

load_dotenv()

from kaggle.api.kaggle_api_extended import KaggleApi

AWS_ACCESS_KEY_ID = os.environ["AWS_ACCESS_KEY_ID"]
AWS_SECRET_ACCESS_KEY = os.environ["AWS_SECRET_ACCESS_KEY"]
AWS_S3_BUCKET = os.environ["AWS_S3_BUCKET"]
AWS_S3_ENDPOINT = os.environ["AWS_S3_ENDPOINT"]
AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")

KAGGLE_DATASET = os.getenv("KAGGLE_DATASET", "grassknoted/asl-alphabet")

PYTHON_DIR = Path(__file__).resolve().parents[0]
TMP_DIR = PYTHON_DIR / "data" / ".kaggle_tmp"
OUT_DIR = PYTHON_DIR / "data" / "asl_shards"

RAW_TRAIN_DIRNAME = "asl_alphabet_train"
RAW_TEST_DIRNAME = "asl_alphabet_test"

S3_TRAIN_PREFIX = "datasets/asl/train"
S3_TEST_PREFIX = "datasets/asl/test"

TARGET_SHARD_BYTES = int(os.getenv("TARGET_SHARD_BYTES", str(256 * 1024 * 1024)))
MAX_ROWS_PER_SHARD = int(os.getenv("MAX_ROWS_PER_SHARD", "50000"))
SHUFFLE_SEED = int(os.getenv("SHUFFLE_SEED", "42"))


def unwrap_single_dir(p: Path) -> Path:
    children = list(p.iterdir())
    if len(children) == 1 and children[0].is_dir():
        return children[0]
    return p


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


def iter_images(root: Path) -> Iterator[tuple[str, Path]]:
    label_dirs = [p for p in root.iterdir() if p.is_dir()]
    if label_dirs:
        for label_dir in sorted(label_dirs):
            label = label_dir.name
            for img in sorted(label_dir.glob("*.jpg")):
                yield label, img
        return

    for img in sorted(root.glob("*.jpg")):
        stem = img.stem
        label = stem.split("_", 1)[0] if "_" in stem else stem
        yield label, img


@dataclass
class Row:
    split: str
    label: str
    key: str
    image_bytes: bytes


def yield_rows_shuffled(split_name: str, split_root: Path, seed: int) -> Iterator[Row]:
    items = [(label, img) for label, img in iter_images(split_root)]
    rnd = random.Random(seed)
    rnd.shuffle(items)

    for label, img in items:
        yield Row(
            split=split_name,
            label=label,
            key=f"{split_name}/{label}/{img.name}",
            image_bytes=img.read_bytes(),
        )


def write_parquet_shards(
    rows: Iterable[Row],
    out_dir: Path,
    target_shard_bytes: int,
    max_rows_per_shard: int,
) -> list[dict]:
    out_dir.mkdir(parents=True, exist_ok=True)

    schema = pa.schema(
        [
            ("split", pa.string()),
            ("label", pa.string()),
            ("key", pa.string()),
            ("image_bytes", pa.binary()),
        ]
    )

    shard_idx = 0
    shard_meta: list[dict] = []

    splits, labels, keys, blobs = [], [], [], []
    approx_bytes = 0
    row_count = 0

    def flush():
        nonlocal shard_idx, splits, labels, keys, blobs, approx_bytes, row_count
        if row_count == 0:
            return

        table = pa.Table.from_arrays(
            [
                pa.array(splits, type=pa.string()),
                pa.array(labels, type=pa.string()),
                pa.array(keys, type=pa.string()),
                pa.array(blobs, type=pa.binary()),
            ],
            schema=schema,
        )

        shard_path = out_dir / f"part-{shard_idx:05d}.parquet"
        pq.write_table(
            table,
            shard_path,
            compression="zstd",
            use_dictionary=True,
            write_statistics=True,
        )

        shard_meta.append(
            {
                "shard_index": shard_idx,
                "local_path": str(shard_path),
                "rows": row_count,
                "approx_payload_bytes": approx_bytes,
            }
        )

        shard_idx += 1
        splits, labels, keys, blobs = [], [], [], []
        approx_bytes = 0
        row_count = 0

    for r in tqdm(rows, desc=f"Sharding {out_dir.name}", unit="img"):
        splits.append(r.split)
        labels.append(r.label)
        keys.append(r.key)
        blobs.append(r.image_bytes)

        approx_bytes += len(r.image_bytes) + len(r.key) + len(r.label) + 32
        row_count += 1

        if approx_bytes >= target_shard_bytes or row_count >= max_rows_per_shard:
            flush()

    flush()
    return shard_meta


def upload_then_delete(s3, local_path: Path, bucket: str, key: str) -> dict:
    size = local_path.stat().st_size
    s3.upload_file(str(local_path), bucket, key)
    local_path.unlink(missing_ok=True)
    return {
        "bucket": bucket,
        "key": key,
        "size_bytes": size,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
    }


def download_kaggle_dataset(tmp_dir: Path) -> None:
    if tmp_dir.exists():
        shutil.rmtree(tmp_dir)
    tmp_dir.mkdir(parents=True, exist_ok=True)

    api = KaggleApi()
    api.authenticate()
    api.dataset_download_files(
        KAGGLE_DATASET, path=str(tmp_dir), unzip=False, quiet=False
    )

    for z in tmp_dir.glob("*.zip"):
        with zipfile.ZipFile(z) as f:
            f.extractall(tmp_dir)
        z.unlink()


def main():
    download_kaggle_dataset(TMP_DIR)

    raw_train = unwrap_single_dir(TMP_DIR / RAW_TRAIN_DIRNAME)
    raw_test = unwrap_single_dir(TMP_DIR / RAW_TEST_DIRNAME)

    if OUT_DIR.exists():
        shutil.rmtree(OUT_DIR)
    (OUT_DIR / "train").mkdir(parents=True)
    (OUT_DIR / "test").mkdir(parents=True)

    train_rows = yield_rows_shuffled("train", raw_train, SHUFFLE_SEED)
    test_rows = yield_rows_shuffled("test", raw_test, SHUFFLE_SEED)

    train_shards = write_parquet_shards(
        train_rows, OUT_DIR / "train", TARGET_SHARD_BYTES, MAX_ROWS_PER_SHARD
    )
    test_shards = write_parquet_shards(
        test_rows, OUT_DIR / "test", TARGET_SHARD_BYTES, MAX_ROWS_PER_SHARD
    )

    s3 = make_s3_client()

    uploads = []
    for m in tqdm(train_shards, desc="Uploading train shards"):
        p = Path(m["local_path"])
        uploads.append(
            upload_then_delete(s3, p, AWS_S3_BUCKET, f"{S3_TRAIN_PREFIX}/{p.name}")
        )

    for m in tqdm(test_shards, desc="Uploading test shards"):
        p = Path(m["local_path"])
        uploads.append(
            upload_then_delete(s3, p, AWS_S3_BUCKET, f"{S3_TEST_PREFIX}/{p.name}")
        )

    shutil.rmtree(TMP_DIR, ignore_errors=True)
    shutil.rmtree(OUT_DIR, ignore_errors=True)

    total_bytes = sum(u["size_bytes"] for u in uploads)
    print("✅ Done")
    print(f"Train : s3://{AWS_S3_BUCKET}/{S3_TRAIN_PREFIX}/")
    print(f"Test  : s3://{AWS_S3_BUCKET}/{S3_TEST_PREFIX}/")
    print(f"Total uploaded: {total_bytes / (1024 * 1024):.1f} MB")


if __name__ == "__main__":
    main()
