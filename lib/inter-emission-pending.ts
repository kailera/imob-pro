import "server-only";

import { prisma } from "@/lib/prisma";

export async function marcarEmissaoInterComoPendente(transacaoId: string) {
  return prisma.transacaoFinanceira.updateMany({
    where: {
      id: transacaoId,
      status: "PENDENTE",
      interCodigoSolicitacao: null,
      interNossoNumero: null,
      interTxId: null,
      interBarcode: null,
    },
    data: { interStatus: "PENDENTE" },
  });
}
