import { createHash } from "node:crypto";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { bucketName, s3Client } from "@/lib/storage";

export const runtime = "nodejs";

const CACHE_CONTROL = "public, max-age=31536000, immutable";

function getAllowedSourceKey(rawUrl: string): string | null {
  try {
    const sourceUrl = new URL(rawUrl);
    const configuredPublicUrl = process.env.RUSTFS_PUBLIC_URL || process.env.RUSTFS_ENDPOINT;
    if (!configuredPublicUrl) return null;

    const allowedUrl = new URL(configuredPublicUrl);
    if (sourceUrl.origin !== allowedUrl.origin) return null;

    const bucketPrefix = `/${bucketName}/`;
    if (!sourceUrl.pathname.startsWith(bucketPrefix)) return null;

    const key = decodeURIComponent(sourceUrl.pathname.slice(bucketPrefix.length));
    if (!key.startsWith("comments/") || key.includes("..")) return null;
    return key;
  } catch {
    return null;
  }
}

async function getObjectBytes(key: string): Promise<Uint8Array> {
  const response = await s3Client.send(new GetObjectCommand({ Bucket: bucketName, Key: key }));
  if (!response.Body) throw new Error("Objeto sem conteúdo.");
  return response.Body.transformToByteArray();
}

export async function GET(request: Request) {
  const sourceUrl = new URL(request.url).searchParams.get("url");
  const sourceKey = sourceUrl ? getAllowedSourceKey(sourceUrl) : null;
  if (!sourceKey) {
    return Response.json({ error: "Imagem inválida." }, { status: 400 });
  }

  const cacheId = createHash("sha256").update(sourceKey).digest("hex");
  const variantKey = `pdf-images/${cacheId}.jpg`;

  try {
    try {
      const cached = await getObjectBytes(variantKey);
      return new Response(Buffer.from(cached), {
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": CACHE_CONTROL,
          "X-PDF-Image-Cache": "HIT",
        },
      });
    } catch (error: any) {
      const status = error?.$metadata?.httpStatusCode;
      if (status && status !== 404) throw error;
    }

    const original = await getObjectBytes(sourceKey);
    const optimized = await sharp(original)
      .rotate()
      .resize({
        width: 1000,
        height: 750,
        fit: "inside",
        withoutEnlargement: true,
      })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 74, progressive: true, mozjpeg: true })
      .toBuffer();

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: variantKey,
        Body: optimized,
        ContentType: "image/jpeg",
        CacheControl: CACHE_CONTROL,
      })
    );

    return new Response(Buffer.from(optimized), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": CACHE_CONTROL,
        "X-PDF-Image-Cache": "MISS",
      },
    });
  } catch (error) {
    console.error("[pdf-image] Falha ao preparar imagem:", sourceKey, error);
    return Response.json({ error: "Não foi possível preparar a imagem." }, { status: 502 });
  }
}
