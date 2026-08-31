import { enqueueScheduledInterSyncTasks } from "@/lib/inter-batch-tasks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET|POST /api/inter/cobrancas/sync
 * Enfileira a reconciliação das cobranças pendentes de cada imobiliária.
 * Autenticação: Authorization: Bearer <CRON_SECRET>
 */
async function handleSynchronization(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json(
      { success: false, error: "CRON_SECRET não configurado." },
      { status: 503 },
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ success: false, error: "Não autorizado." }, { status: 401 });
  }

  try {
    const tasks = await enqueueScheduledInterSyncTasks();
    const failures = tasks.filter(task => "error" in task);
    return Response.json({
      success: failures.length === 0,
      queued: tasks.filter(task => "created" in task && task.created).length,
      tasks,
    }, { status: failures.length === 0 ? 202 : 207 });
  } catch (error) {
    console.error("[inter-status-cron] Falha ao enfileirar sincronização:", error);
    return Response.json(
      { success: false, error: "Falha interna ao sincronizar cobranças do Banco Inter." },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return handleSynchronization(request);
}

export async function POST(request: Request) {
  return handleSynchronization(request);
}
