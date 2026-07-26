import "server-only";

import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, bucketName } from "@/lib/storage";
import type { LeaseAttachment } from "./anexos";

export async function deleteRemovedLeaseAttachments(
  previous: LeaseAttachment[],
  current: LeaseAttachment[],
  storagePrefix: string,
) {
  const currentKeys = new Set(current.map(item => item.storageKey).filter(Boolean));
  const removedKeys = previous
    .map(item => item.storageKey)
    .filter((key): key is string => Boolean(key?.startsWith(storagePrefix) && !currentKeys.has(key)));

  await Promise.all(removedKeys.map(async key => {
    try {
      await s3Client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }));
    } catch (error) {
      console.error(`[lease-attachment] Não foi possível remover ${key}:`, error);
    }
  }));
}
