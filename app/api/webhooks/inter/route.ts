import { NextRequest, NextResponse } from "next/server";
import {
  InterWebhookValidationError,
  parseInterWebhookPayload,
  webhookSecretMatches,
} from "@/lib/inter-webhook";
import { processInterWebhookEvent } from "@/lib/inter-webhook-processor";

const MAX_BODY_BYTES = 256 * 1024;

/**
 * Recebe callbacks da API Cobrança V3 do Banco Inter.
 *
 * A rota permanece protegida pelo Clerk nesta fase. Antes de torná-la pública no
 * proxy.ts, o Traefik deve exigir mTLS e sobrescrever x-inter-webhook-secret.
 */
export async function POST(request: NextRequest) {
  const expectedSecret = process.env.INTER_WEBHOOK_PROXY_SECRET;
  if (!expectedSecret) {
    console.error("[webhook-inter] INTER_WEBHOOK_PROXY_SECRET não configurado.");
    return NextResponse.json({ error: "Webhook indisponível." }, { status: 503 });
  }

  if (!webhookSecretMatches(request.headers.get("x-inter-webhook-secret"), expectedSecret)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload muito grande." }, { status: 413 });
  }

  try {
    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Payload muito grande." }, { status: 413 });
    }

    let decoded: unknown;
    try {
      decoded = JSON.parse(rawBody);
    } catch {
      throw new InterWebhookValidationError("JSON inválido.");
    }

    const events = parseInterWebhookPayload(decoded);
    const account = request.headers.get("x-conta-corrente")?.trim() || null;
    const results = [];
    for (const event of events) {
      results.push(await processInterWebhookEvent(event, account));
    }

    const failures = results.filter((result) => result.outcome === "error");
    if (failures.length > 0) {
      console.error("[webhook-inter] Eventos não processados:", failures.map((item) => item.eventKey));
      return NextResponse.json(
        { error: "Um ou mais eventos não puderam ser processados." },
        { status: 500 },
      );
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof InterWebhookValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[webhook-inter] Falha inesperada no callback:", error);
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}
