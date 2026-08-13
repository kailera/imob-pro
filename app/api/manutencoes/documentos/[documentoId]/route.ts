import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ documentoId: string }> }) {
  const { userId, orgId } = await auth();
  if (!userId) return new Response("Não autorizado.", { status: 401 });
  const imob = orgId
    ? await prisma.imob.findUnique({ where: { orgId }, select: { id: true } })
    : await prisma.imob.findFirst({ where: { orgId: "org_default" }, select: { id: true } });
  if (!imob) return new Response("Imobiliária não encontrada.", { status: 404 });

  const { documentoId } = await context.params;
  const documento = await prisma.documentoManutencao.findFirst({
    where: { id: documentoId, manutencao: { imobId: imob.id } },
    select: { url: true, mimeType: true, nomeOriginal: true },
  });
  if (!documento) return new Response("Documento não encontrado.", { status: 404 });

  const headers = {
    "Content-Type": documento.mimeType,
    "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(documento.nomeOriginal)}`,
    "Cache-Control": "private, no-store",
  };
  const inline = documento.url.match(/^data:([^;,]+);base64,(.+)$/);
  if (inline) return new Response(Buffer.from(inline[2], "base64"), { headers: { ...headers, "Content-Type": inline[1] } });

  try {
    const source = await fetch(documento.url, { cache: "no-store" });
    if (!source.ok || !source.body) return new Response("Documento indisponível.", { status: 502 });
    return new Response(source.body, { headers: { ...headers, "Content-Type": source.headers.get("content-type") || documento.mimeType } });
  } catch {
    return new Response("Documento indisponível.", { status: 502 });
  }
}
