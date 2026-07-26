"use server";

import { CreateBucketCommand, DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { requireUserContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { bucketName, s3Client } from "@/lib/storage";
import type { LeaseAttachment } from "@/lib/locacao/anexos";

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
]);

export async function uploadLeaseAttachment(
  leaseId: string,
  formData: FormData,
): Promise<{ success: true; attachment: LeaseAttachment } | { success: false; message: string }> {
  const context = await requireUserContext();
  const lease = await prisma.lease.findFirst({
    where: { id: leaseId, tenantId: context.tenantId },
    select: { id: true },
  });
  if (!lease) return { success: false, message: "Contrato não encontrado." };

  const file = formData.get("file");
  const title = typeof formData.get("title") === "string"
    ? String(formData.get("title")).trim().slice(0, 160)
    : "";

  if (!(file instanceof File) || file.size === 0) {
    return { success: false, message: "Selecione um arquivo." };
  }
  if (!title) return { success: false, message: "Informe o título do arquivo." };
  if (file.size > MAX_FILE_SIZE) {
    return { success: false, message: "O arquivo deve ter no máximo 15 MB." };
  }

  const mimeType = file.type || "application/octet-stream";
  if (!allowedMimeTypes.has(mimeType)) {
    return { success: false, message: "Formato não permitido. Use PDF, imagem, Word, Excel ou TXT." };
  }

  const safeName = file.name.replace(/[^\w.-]+/g, "-").slice(-180) || "arquivo";
  const storageKey = `leases/${context.tenantId}/${leaseId}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const isMock = !process.env.RUSTFS_ENDPOINT || process.env.RUSTFS_MOCK === "true";

  let url: string;
  if (isMock) {
    url = `data:${mimeType};base64,${buffer.toString("base64")}`;
  } else {
    const upload = new PutObjectCommand({
      Bucket: bucketName,
      Key: storageKey,
      Body: buffer,
      ContentType: mimeType,
      ContentDisposition: `attachment; filename="${safeName}"`,
    });
    try {
      await s3Client.send(upload);
    } catch (error) {
      if (!isNoSuchBucket(error)) throw error;
      await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
      await s3Client.send(upload);
    }
    const endpoint = process.env.RUSTFS_PUBLIC_URL || process.env.RUSTFS_ENDPOINT || "http://localhost:9000";
    url = `${endpoint}/${bucketName}/${storageKey}`;
  }

  return {
    success: true,
    attachment: {
      id: crypto.randomUUID(),
      title,
      fileName: file.name.slice(0, 255),
      url,
      mimeType,
      storageKey,
    },
  };
}

export async function discardLeaseAttachment(leaseId: string, storageKey: string) {
  const context = await requireUserContext();
  const lease = await prisma.lease.findFirst({
    where: { id: leaseId, tenantId: context.tenantId },
    select: { id: true },
  });
  const expectedPrefix = `leases/${context.tenantId}/${leaseId}/`;
  if (!lease || !storageKey.startsWith(expectedPrefix)) return { success: false };

  try {
    await s3Client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: storageKey }));
  } catch (error) {
    console.error(`[lease-attachment] Falha ao descartar ${storageKey}:`, error);
  }
  return { success: true };
}

function isNoSuchBucket(error: unknown) {
  return typeof error === "object" && error !== null && "name" in error
    && (error as { name?: string }).name === "NoSuchBucket";
}
