import { sincronizarIndicesRecentes } from "@/lib/indices/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo) {
    return Response.json(
      { success: false, error: "CRON_SECRET não configurado." },
      { status: 503 },
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return Response.json({ success: false, error: "Não autorizado." }, { status: 401 });
  }

  const resultados = await sincronizarIndicesRecentes(18);
  const falhas = resultados.filter((resultado) => !resultado.success);
  return Response.json(
    { success: falhas.length === 0, resultados },
    { status: falhas.length === 0 ? 200 : 502 },
  );
}
