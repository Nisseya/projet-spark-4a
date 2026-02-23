import os
from dataclasses import dataclass
from typing import Optional

import boto3
from botocore.client import Config


@dataclass(frozen=True)
class RustFsConfig:
    bucket: str
    endpoint_url: Optional[str]
    region: str
    access_key_id: str
    secret_access_key: str

# Rustfs has the endpoint public that will be in front of nginx

class RustFs:

    def __init__(self, cfg: RustFsConfig) -> None:
        self.cfg = cfg
        print(cfg)
        self.s3 = boto3.client(
            "s3",
            region_name=cfg.region,
            aws_access_key_id=cfg.access_key_id,
            aws_secret_access_key=cfg.secret_access_key,
            endpoint_url=cfg.endpoint_url,
            config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
        )

    def presigned_put_url(
        self,
        *,
        key: str,
        expires_in_seconds: int = 900,
        content_type: str = "application/octet-stream",
    ) -> str:
        return self.s3.generate_presigned_url(
            ClientMethod="put_object",
            Params={
                "Bucket": self.cfg.bucket,
                "Key": key,
                "ContentType": content_type,
            },
            ExpiresIn=expires_in_seconds,
        )


def load_rustfs_from_env() -> RustFs:
    def req(name: str) -> str:
        v = os.getenv(name)
        if not v:
            raise RuntimeError(f"Missing env var: {name}")
        return v

    cfg = RustFsConfig(
        bucket=req("AWS_S3_BUCKET"),
        endpoint_url=os.getenv("AWS_S3_PUBLIC_ENDPOINT"),
        region=os.getenv("AWS_REGION", "us-east-1"),
        access_key_id=req("AWS_ACCESS_KEY_ID"),
        secret_access_key=req("AWS_SECRET_ACCESS_KEY"),
    )
    return RustFs(cfg)