export interface InspectionMediaItem {
  url?: string;
  type?: string;
  [key: string]: unknown;
}

const TEMP_VIDEO_KEY_PATTERN = /(?:^|\/)(comments\/temp\/[^/?#]+)/;

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
      return { ...mediaItem, url: finalUrl, type: "video" };
    }
    return mediaItem;
  });

  return { media: nextMedia, updated };
}
