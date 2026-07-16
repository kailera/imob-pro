import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!Array.isArray(body)) {
      console.warn("[webhook-inter] Payload recebido não é uma lista/array:", body);
      return NextResponse.json({ success: false, error: "Payload inválido. Esperado um array." }, { status: 400 });
    }

    console.log(`[webhook-inter] Recebida notificação com ${body.length} eventos.`);

    for (const evento of body) {
      const {
        codigoSolicitacao,
        nossoNumero,
        seuNumero,
        situacao,
        dataHoraSituacao,
        valorTotalRecebido,
      } = evento;

      if (!codigoSolicitacao && !nossoNumero) {
        console.warn("[webhook-inter] Evento ignorado por falta de identificador único:", evento);
        continue;
      }

      // Procura a transação correspondente no banco de dados local
      // Pode buscar pelo interNossoNumero (que é retornado como nossoNumero ou retornado ao criar)
      const transacao = await prisma.transacaoFinanceira.findFirst({
        where: {
          OR: [
            codigoSolicitacao ? { id: codigoSolicitacao } : undefined,
            nossoNumero ? { interNossoNumero: nossoNumero } : undefined,
            seuNumero ? { id: seuNumero } : undefined,
          ].filter(Boolean) as any[],
        },
      });

      if (!transacao) {
        console.warn(`[webhook-inter] Transação não encontrada para evento:`, { codigoSolicitacao, nossoNumero, seuNumero });
        continue;
      }

      let statusTransacao = transacao.status;
      let dataPagamento = transacao.dataPagamento;

      // Mapeia os status do Banco Inter
      if (["RECEBIDO", "PAGO", "MARCADO_RECEBIDO"].includes(situacao)) {
        statusTransacao = "LIQUIDADO";
        dataPagamento = dataHoraSituacao ? new Date(dataHoraSituacao) : new Date();
      } else if (["CANCELADO", "EXPIRADO", "FALHA_EMISSAO"].includes(situacao)) {
        statusTransacao = "CANCELADO";
      }

      await prisma.transacaoFinanceira.update({
        where: { id: transacao.id },
        data: {
          interStatus: situacao,
          status: statusTransacao,
          dataPagamento,
        },
      });

      if (statusTransacao === "LIQUIDADO") {
        try {
          const { criarRepassePendente } = await import("@/app/actions/financeiroActions");
          await criarRepassePendente(transacao.id);
        } catch (repasseErr) {
          console.error("[webhook-inter] Erro ao criar repasse automático:", repasseErr);
        }
      }

      console.log(`[webhook-inter] Transação ${transacao.id} atualizada com sucesso para status: ${statusTransacao} (Inter: ${situacao})`);
    }

    return new Response(null, { status: 204 });
  } catch (error: any) {
    console.error("[webhook-inter] Erro crítico no processamento do webhook:", error);
    return NextResponse.json({ success: false, error: error.message || "Erro interno do servidor." }, { status: 500 });
  }
}
