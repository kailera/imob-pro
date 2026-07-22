import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { createPendingRepasseForRent } from "@/lib/financeiro/repasse";
import { createInterWebhookEventKey, type InterWebhookPayload } from "@/lib/inter-webhook";

export type WebhookProcessingResult =
  | { outcome: "processed" | "duplicate" | "ignored"; eventKey: string }
  | { outcome: "error"; eventKey: string; error: string };

export async function processInterWebhookEvent(
  event: InterWebhookPayload,
  account: string | null,
): Promise<WebhookProcessingResult> {
  const eventKey = createInterWebhookEventKey(event, account);

  return prisma.$transaction(async (db) => {
    const storedEvent = await db.interWebhookEvent.upsert({
      where: { eventKey },
      create: {
        eventKey,
        codigoSolicitacao: event.codigoSolicitacao,
        nossoNumero: event.nossoNumero,
        seuNumero: event.seuNumero,
        contaCorrente: account,
        situacao: event.situacao,
        origemRecebimento: event.origemRecebimento,
        valorTotalRecebido: event.valorTotalRecebido,
        dataHoraSituacao: event.dataHoraSituacao ? new Date(event.dataHoraSituacao) : undefined,
        payload: event as Prisma.InputJsonObject,
        status: "RECEBIDO",
        tentativas: 1,
      },
      update: { tentativas: { increment: 1 } },
    });

    if (storedEvent.status === "PROCESSADO" || storedEvent.status === "IGNORADO") {
      return { outcome: "duplicate", eventKey };
    }

    await db.interWebhookEvent.update({
      where: { eventKey },
      data: { status: "PROCESSANDO", erro: null },
    });

    const identifiers: Prisma.TransacaoFinanceiraWhereInput[] = [];
    if (event.codigoSolicitacao) identifiers.push({ interCodigoSolicitacao: event.codigoSolicitacao });
    if (event.nossoNumero) identifiers.push({ interNossoNumero: event.nossoNumero });
    if (event.seuNumero) identifiers.push({ interSeuNumero: event.seuNumero });

    const transaction = await db.transacaoFinanceira.findFirst({
      where: { OR: identifiers },
    });

    if (!transaction) {
      const error = "Cobrança local não encontrada para os identificadores enviados pelo Inter.";
      await db.interWebhookEvent.update({
        where: { eventKey },
        data: { status: "ERRO", erro: error },
      });
      return { outcome: "error", eventKey, error };
    }

    const receivedValue = event.valorTotalRecebido === undefined
      ? undefined
      : Number(event.valorTotalRecebido);
    if (event.situacao === "RECEBIDO" && receivedValue !== undefined && receivedValue + 0.01 < transaction.valor) {
      const error = `Valor recebido inferior ao valor da cobrança local (${event.valorTotalRecebido} < ${transaction.valor.toFixed(2)}).`;
      await db.interWebhookEvent.update({
        where: { eventKey },
        data: { status: "ERRO", erro: error },
      });
      return { outcome: "error", eventKey, error };
    }

    const receivedAt = event.dataHoraSituacao ? new Date(event.dataHoraSituacao) : new Date();
    const isReceived = event.situacao === "RECEBIDO";
    const isCanceled = event.situacao === "CANCELADO" || event.situacao === "FALHA_EMISSAO";
    const nextStatus = isReceived
      ? "LIQUIDADO"
      : isCanceled && transaction.status !== "LIQUIDADO"
        ? "CANCELADO"
        : transaction.status;

    await db.transacaoFinanceira.update({
      where: { id: transaction.id },
      data: {
        interStatus: event.situacao,
        interCodigoSolicitacao: event.codigoSolicitacao ?? transaction.interCodigoSolicitacao,
        interNossoNumero: event.nossoNumero ?? transaction.interNossoNumero,
        interSeuNumero: event.seuNumero ?? transaction.interSeuNumero,
        interTxId: event.txid ?? transaction.interTxId,
        interOrigemRecebimento: event.origemRecebimento ?? transaction.interOrigemRecebimento,
        interDataRecebimento: isReceived ? receivedAt : transaction.interDataRecebimento,
        interValorRecebido: isReceived && event.valorTotalRecebido !== undefined
          ? event.valorTotalRecebido
          : transaction.interValorRecebido,
        status: nextStatus,
        dataPagamento: isReceived ? receivedAt : transaction.dataPagamento,
      },
    });

    if (isReceived) {
      await createPendingRepasseForRent(db, transaction.id);
    }

    const ignored = !isReceived && !isCanceled;
    await db.interWebhookEvent.update({
      where: { eventKey },
      data: {
        status: ignored ? "IGNORADO" : "PROCESSADO",
        processadoEm: new Date(),
      },
    });

    return { outcome: ignored ? "ignored" : "processed", eventKey };
  });
}
