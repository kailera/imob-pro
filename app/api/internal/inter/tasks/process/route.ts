import { randomUUID } from "node:crypto";
import { processNextInterBatchItem } from "@/lib/inter-batch-tasks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(
    secret
    && request.headers.get("authorization") === `Bearer ${secret}`,
  );
}

/** Processa no máximo um item; chamado exclusivamente pelo worker interno. */
export async function POST(request: Request) {
  if (!process.env.CRON_SECRET) {
    return Response.json(
      { success: false, error: "CRON_SECRET não configurado." },
      { status: 503 },
    );
  }
  if (!authorized(request)) {
    return Response.json({ success: false, error: "Não autorizado." }, { status: 401 });
  }

  try {
    const requestedWorkerId = request.headers.get("x-worker-id")?.trim();
    const workerId = requestedWorkerId
      ? requestedWorkerId.slice(0, 100)
      : `http:${randomUUID()}`;
    const task = await processNextInterBatchItem(workerId);
    if (!task) return new Response(null, { status: 204 });
    return Response.json({ success: true, data: task });
  } catch (error) {
    console.error("[inter-batch-worker-api] Falha:", error);
    return Response.json(
      { success: false, error: "Falha interna ao processar a fila." },
      { status: 500 },
    );
  }
}
