export interface InspectionMediaItem {
  url: string;
  type?: "image" | "video";
  [key: string]: unknown;
}

const TEMP_VIDEO_KEY_PATTERN = /(?:^|\/)(comments\/temp\/[^/?#]+)/;
const VIDEO_EXTENSION_PATTERN = /\.(mp4|mov|m4v|webm|avi|mpeg|mpg)(?:$|[?#])/i;

export function normalizeInspectionMediaItem(value: unknown): InspectionMediaItem | null {
  if (!value || typeof value !== "object") return null;

  const item = value as Record<string, unknown>;
  const url = typeof item.url === "string" ? item.url : "";
  if (!url) return null;

  const declaredType = String(item.type || item.tipo || "").toLocaleLowerCase("pt-BR");
  const type = declaredType === "video" || declaredType === "vídeo" || VIDEO_EXTENSION_PATTERN.test(url)
    ? "video"
    : "image";

  return { ...item, url, type };
}

export function normalizeInspectionMedia(value: unknown): InspectionMediaItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const normalized = normalizeInspectionMediaItem(item);
    return normalized ? [normalized] : [];
  });
}

export function replaceSyncedOfflineComment(
  comments: unknown[],
  input: {
    tempCommentId?: string;
    roomId: string;
    text: string;
    serverCommentId: string;
    createdAt: unknown;
    media: InspectionMediaItem[];
  }
): unknown[] {
  return comments.map((value) => {
    if (!value || typeof value !== "object") return value;
    const comment = value as Record<string, unknown>;
    const commentId = typeof comment.id === "string" ? comment.id : "";
    const isPendingComment = input.tempCommentId
      ? commentId === input.tempCommentId
      : (comment.texto === input.text || comment.text === input.text)
        && comment.roomId === input.roomId
        && commentId.startsWith("temp-");

    if (!isPendingComment) return value;

    const currentComment = { ...comment };
    delete currentComment.media;
    delete currentComment.timestamp;
    return {
      ...currentComment,
      id: input.serverCommentId,
      texto: input.text,
      midias: input.media,
      createdAt: input.createdAt,
    };
  });
}

export function getPendingVideoFileKey(url: string): string | null {
  return url.match(TEMP_VIDEO_KEY_PATTERN)?.[1] || null;
}

export function getOptimizedVideoUrl(url: string): string | null {
  const fileKey = getPendingVideoFileKey(url);
  if (!fileKey) return null;

  const filename = fileKey.slice("comments/temp/".length);
  const extensionIndex = filename.lastIndexOf(".");
  const basename = extensionIndex > 0 ? filename.slice(0, extensionIndex) : filename;

  return url.replace(fileKey, `comments/${basename}.mp4`);
}

export function replacePendingVideoUrl(
  media: unknown,
  fileKey: string,
  finalUrl: string
): { media: InspectionMediaItem[]; updated: boolean } {
  if (!Array.isArray(media)) return { media: [], updated: false };

  let updated = false;
  const nextMedia = media.map((item) => {
    if (!item || typeof item !== "object") return item as InspectionMediaItem;

    const mediaItem = item as InspectionMediaItem;
    if (typeof mediaItem.url === "string" && mediaItem.url.includes(fileKey)) {
      updated = true;
      return { ...mediaItem, url: finalUrl, type: "video" as const };
    }
    return mediaItem;
  });

  return { media: nextMedia, updated };
}
