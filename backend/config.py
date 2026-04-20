import os
from dotenv import load_dotenv

load_dotenv()

S3_ENDPOINT        = os.environ["AWS_S3_ENDPOINT"]
S3_ACCESS_KEY      = os.environ["AWS_ACCESS_KEY_ID"]
S3_SECRET_KEY      = os.environ["AWS_SECRET_ACCESS_KEY"]
S3_BUCKET          = os.environ["AWS_S3_BUCKET"]

PG_DSN             = os.environ["POSTGRES_DSN"]  # postgresql://user:pass@host:port/db

SBT_PROJECT_DIR    = os.environ["SBT_PROJECT_DIR"]  # /home/nisseya/esgi/.../spark-scala

PRESIGN_TTL        = int(os.environ.get("PRESIGN_TTL", "900"))  # 15 min