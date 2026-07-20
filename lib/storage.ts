import { S3Client } from "@aws-sdk/client-s3";

const endpoint = process.env.RUSTFS_PUBLIC_URL || process.env.RUSTFS_ENDPOINT || process.env.RUSTFS_ENDPOINT_URL || "http://localhost:9000";
const accessKeyId = process.env.RUSTFS_ACCESS_KEY_ID || process.env.RUSTFS_ACCESS_KEY || "minioadmin";
const secretAccessKey = process.env.RUSTFS_SECRET_ACCESS_KEY || process.env.RUSTFS_SECRET_KEY || "minioadmin";

export const s3Client = new S3Client({
  endpoint,
  region: "us-east-1",
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  forcePathStyle: true,
});

export const bucketName = process.env.RUSTFS_BUCKET_NAME || process.env.RUSTFS_BUCKET || "vistorias";
