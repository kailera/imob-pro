import { S3Client } from "@aws-sdk/client-s3";

const rustfs_client = new S3Client({
  region: "cn-east-1",
  credentials: {
    accessKeyId: process.env.RUSTFS_ACCESS_KEY!,
    secretAccessKey: process.env.RUSTFS_SECRET_KEY!,
  },
  endpoint: process.env.RUSTFS_ENDPOINT_URL!,
  forcePathStyle: true,
});

export default rustfs_client;
