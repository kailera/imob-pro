export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET|POST /api/inter/cobrancas/sync
 * Endpoint legado mantido apenas para neutralizar cronjobs de versões antigas.
 * A sincronização deve ser iniciada pelo botão da tela de cobranças.
 */
function automaticSynchronizationDisabled() {
  return Response.json({
    success: false,
    error: "Sincronização automática desativada. Use o botão Atualizar status dos boletos.",
  }, { status: 410 });
}

export async function GET() {
  return automaticSynchronizationDisabled();
}

export async function POST() {
  return automaticSynchronizationDisabled();
}
