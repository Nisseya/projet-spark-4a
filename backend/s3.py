import boto3
from botocore.client import Config
from config import (
    S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET, PRESIGN_TTL
)

_s3 = boto3.client(
    "s3",
    endpoint_url=S3_ENDPOINT,
    aws_access_key_id=S3_ACCESS_KEY,
    aws_secret_access_key=S3_SECRET_KEY,
    config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
    region_name="us-east-1",
)

def presign_get(key: str, ttl: int = PRESIGN_TTL) -> str:
    return _s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": S3_BUCKET, "Key": key},
        ExpiresIn=ttl,
    )

def presign_put(key: str, content_type: str, ttl: int = PRESIGN_TTL) -> str:
    return _s3.generate_presigned_url(
        "put_object",
        Params={"Bucket": S3_BUCKET, "Key": key, "ContentType": content_type},
        ExpiresIn=ttl,
    )

def find_part_file(prefix: str) -> str | None:
    """Retourne la clé du part-*.json dans un dossier Spark."""
    resp = _s3.list_objects_v2(Bucket=S3_BUCKET, Prefix=prefix)
    for obj in resp.get("Contents", []):
        key = obj["Key"]
        if "/part-" in key and key.endswith(".json"):
            return key
    return None