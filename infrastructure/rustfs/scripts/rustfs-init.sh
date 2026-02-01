#!/bin/sh
set -eux

echo "Attente de RustFS..."
until aws --endpoint-url http://rustfs:9000 s3api list-buckets >/dev/null 2>&1; do
  sleep 1
done

echo "Création du bucket: $AWS_S3_BUCKET (si absent)..."
aws --endpoint-url http://rustfs:9000 s3api head-bucket --bucket "$AWS_S3_BUCKET" >/dev/null 2>&1 \
  || aws --endpoint-url http://rustfs:9000 s3api create-bucket --bucket "$AWS_S3_BUCKET"


echo "Done."
