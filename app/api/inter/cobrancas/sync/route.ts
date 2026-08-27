import {
  InterStatusSyncAlreadyRunningError,
  synchronizePendingInterCharges,
} from "@/lib/inter-status-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET|POST /api/inter/cobrancas/sync
 * Reconcilia as cobranças pendentes com a API Cobrança V3 do Banco Inter.
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
    const report = await synchronizePendingInterCharges();
    return Response.json(
      { success: report.failed === 0, report },
      { status: report.failed === 0 ? 200 : 207 },
    );
  } catch (error) {
    if (error instanceof InterStatusSyncAlreadyRunningError) {
      return Response.json({ success: false, error: error.message }, { status: 409 });
    }
    console.error("[inter-status-cron] Falha na sincronização:", error);
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
