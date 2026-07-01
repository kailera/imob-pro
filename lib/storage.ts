import { S3Client } from "@aws-sdk/client-s3";

const endpoint = process.env.RUSTFS_ENDPOINT;
const accessKeyId = process.env.RUSTFS_ACCESS_KEY_ID;
const secretAccessKey = process.env.RUSTFS_SECRET_ACCESS_KEY;

export const s3Client = new S3Client({
  endpoint: endpoint || "http://localhost:9000", // Fallback padrão
  region: "us-east-1", // O SDK do S3 exige uma região fictícia
  credentials: {
    accessKeyId: accessKeyId || "minioadmin",
    secretAccessKey: secretAccessKey || "minioadmin",
  },
  forcePathStyle: true, // Necessário para provedores S3 compatíveis como RustFS e MinIO
});

export const bucketName = process.env.RUSTFS_BUCKET_NAME || "vistorias";
