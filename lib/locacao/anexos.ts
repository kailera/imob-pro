export type LeaseAttachment = {
  id: string;
  title: string;
  fileName: string;
  url: string;
  mimeType: string;
  storageKey?: string;
};

const MAX_ATTACHMENTS_PER_FIELD = 30;

export function parseLeaseAttachments(value: string | null | undefined): LeaseAttachment[] {
  if (!value?.trim()) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return legacyAttachment(value);
    return parsed
      .slice(0, MAX_ATTACHMENTS_PER_FIELD)
      .map(normalizeAttachment)
      .filter((attachment): attachment is LeaseAttachment => attachment !== null);
  } catch {
    return legacyAttachment(value);
  }
}

export function parseLeaseAttachmentsFormValue(
  value: FormDataEntryValue | null,
  storagePrefix: string,
) {
  if (typeof value !== "string" || !value.trim()) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .slice(0, MAX_ATTACHMENTS_PER_FIELD)
      .map(normalizeAttachment)
      .filter((attachment): attachment is LeaseAttachment => {
        if (!attachment) return false;
        if (attachment.storageKey && !attachment.storageKey.startsWith(storagePrefix)) return false;
        return isSafeAttachmentUrl(attachment.url);
      });
  } catch {
    return [];
  }
}

export function serializeLeaseAttachments(attachments: LeaseAttachment[]) {
  return attachments.length ? JSON.stringify(attachments) : null;
}

function normalizeAttachment(value: unknown): LeaseAttachment | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const url = cleanString(item.url, 20_000);
  if (!url || !isSafeAttachmentUrl(url)) return null;

  const fileName = cleanString(item.fileName ?? item.name, 255) || "arquivo";
  return {
    id: cleanString(item.id, 100) || createStableLegacyId(url),
    title: cleanString(item.title ?? item.description, 160) || fileName,
    fileName,
    url,
    mimeType: cleanString(item.mimeType, 120) || "application/octet-stream",
    storageKey: cleanString(item.storageKey, 600) || undefined,
  };
}

function legacyAttachment(url: string): LeaseAttachment[] {
  if (!isSafeAttachmentUrl(url)) return [];
  const fileName = url.split("/").at(-1)?.split("?")[0] || "Documento";
  return [{
    id: createStableLegacyId(url),
    title: "Documento",
    fileName,
    url,
    mimeType: "application/octet-stream",
  }];
}

function cleanString(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function isSafeAttachmentUrl(url: string) {
  return url.startsWith("https://")
    || url.startsWith("http://")
    || url.startsWith("/api/mock-upload")
    || /^data:(application\/pdf|application\/msword|application\/vnd\.[\w.+-]+|image\/[\w.+-]+|text\/plain);base64,/i.test(url);
}

function createStableLegacyId(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }
  return `legacy-${Math.abs(hash)}`;
}
