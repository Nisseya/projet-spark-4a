import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

const S3_BUCKET = requireEnv("S3_BUCKET");
const S3_ENDPOINT = requireEnv("S3_ENDPOINT");
const S3_REGION = process.env.S3_REGION ?? "auto";

const S3_ACCESS_KEY_ID = requireEnv("S3_ACCESS_KEY_ID");
const S3_SECRET_ACCESS_KEY = requireEnv("S3_SECRET_ACCESS_KEY");

export const s3 = new S3Client({
  region: S3_REGION,
  endpoint: S3_ENDPOINT,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "1", // set to "1" for many MinIO/RustFS setups
  credentials: {
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
  },
});

export type PresignPutArgs = {
  key: string;
  contentType?: string; // strongly recommended for uploads
  expiresInSeconds?: number; // default 300s
};

export async function presignPut({
  key,
  contentType,
  expiresInSeconds = 300,
}: PresignPutArgs): Promise<{ url: string; bucket: string; key: string; expiresInSeconds: number }> {
  const cmd = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const url = await getSignedUrl(s3, cmd, { expiresIn: expiresInSeconds });
  return { url, bucket: S3_BUCKET, key, expiresInSeconds };
}

export type PresignGetArgs = {
  key: string;
  expiresInSeconds?: number; // default 300s
  responseContentType?: string; // optional override
  responseContentDisposition?: string; // e.g. 'inline' or 'attachment; filename="video.mp4"'
};

export async function presignGet({
  key,
  expiresInSeconds = 300,
  responseContentType,
  responseContentDisposition,
}: PresignGetArgs): Promise<{ url: string; bucket: string; key: string; expiresInSeconds: number }> {
  const cmd = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ResponseContentType: responseContentType,
    ResponseContentDisposition: responseContentDisposition,
  });

  const url = await getSignedUrl(s3, cmd, { expiresIn: expiresInSeconds });
  return { url, bucket: S3_BUCKET, key, expiresInSeconds };
}
