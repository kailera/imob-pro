import rustfs_client from "./../rust/client";
import {
  CreateBucketCommand,
  DeleteBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  ListBucketsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fs from "fs";

const bucketName = process.env.RUSTFS_BUCKET!;

export async function createBucket() {
  try {
    const response = await rustfs_client.send(
      new CreateBucketCommand({
        Bucket: bucketName,
      }),
    );
    console.log(response);
  } catch (error) {
    console.log(error);
  }
}

export async function deleteBucket() {
  try {
    const response = await rustfs_client.send(
      new DeleteBucketCommand({
        Bucket: bucketName,
      }),
    );
    console.log(response);
  } catch (error) {
    console.log(error);
  }
}

export async function listBuckets() {
  try {
    const response = await rustfs_client.send(new ListBucketsCommand({}));
    console.log(response);
  } catch (error) {
    console.log(error);
  }
}

export async function listObjects() {
  try {
    const response = await rustfs_client.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
      }),
    );
    console.log(response);
  } catch (error) {
    console.log(error);
  }
}

export async function uploadFile(key: string, body: Buffer | ReadableStream | Uint8Array | string) {
  try {
    const response = await rustfs_client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: body,
      }),
    );
    return response;
  } catch (error) {
    console.error("Erro ao fazer upload no S3:", error);
    throw error;
  }
}

export async function deleteFile(key: string) {
  try {
    const response = await rustfs_client.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      }),
    );
    return response;
  } catch (error) {
    console.error("Erro ao deletar arquivo no S3:", error);
    throw error;
  }
}

export async function getDownloadUrl(key: string) {
  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    // Gera uma URL temporária válida por 1 hora
    return await getSignedUrl(rustfs_client, command, { expiresIn: 3600 });
  } catch (error) {
    console.error("Erro ao gerar URL presignada do S3:", error);
    throw error;
  }
}

export async function getObjectBuffer(key: string): Promise<Buffer | null> {
  try {
    const response = await rustfs_client.send(
      new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      }),
    );

    if (response.Body) {
      const chunks: Buffer[] = [];
      for await (const chunk of response.Body as any) {
        chunks.push(chunk as Buffer);
      }
      return Buffer.concat(chunks);
    }
    return null;
  } catch (error) {
    console.error("Erro ao ler objeto do bucket:", error);
    return null;
  }
}
