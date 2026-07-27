export type DescontoInterV3 = {
  codigo: "VALORFIXODATAINFORMADA" | "PERCENTUALDATAINFORMADA";
  quantidadeDias: number;
  valor?: number;
  taxa?: number;
};

/** Converte a bonificação contratual para o payload da API Cobrança V3 do Inter. */
export function criarDescontoInterV3(input: {
  valor: number | null | undefined;
  tipo: string | null | undefined;
  diasAntesDoVencimento: number | null | undefined;
}): DescontoInterV3 | undefined {
  if (!input.valor || input.valor <= 0) return undefined;

  const quantidadeDias = Math.max(0, Math.trunc(input.diasAntesDoVencimento ?? 0));
  if (input.tipo === "VALOR" || input.tipo === "FIXED") {
    return { codigo: "VALORFIXODATAINFORMADA", quantidadeDias, valor: input.valor };
  }
  if (input.tipo === "PERCENTUAL" || input.tipo === "PERCENTAGE") {
    return { codigo: "PERCENTUALDATAINFORMADA", quantidadeDias, taxa: input.valor };
  }
  return undefined;
}

export function criarInstrucoesBoletoInter(input: {
  desconto?: DescontoInterV3;
  multaPercentual?: number | null;
  dataVencimento: string;
}): string[] {
  const instrucoes: string[] = [];

  if (input.desconto) {
    const limite = new Date(`${input.dataVencimento}T00:00:00.000Z`);
    limite.setUTCDate(limite.getUTCDate() - input.desconto.quantidadeDias);
    const dataLimite = limite.toLocaleDateString("pt-BR", { timeZone: "UTC" });
    const valorDesconto = input.desconto.valor != null
      ? input.desconto.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }).replace(/\u00a0/g, " ")
      : `${(input.desconto.taxa ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
    instrucoes.push(`Pagamento com desconto de ${valorDesconto} ate dia ${dataLimite}.`);
  }

  if (input.multaPercentual && input.multaPercentual > 0) {
    const multa = input.multaPercentual.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    instrucoes.push(`Apos o vencimento: multa de ${multa}%.`);
  }

  return instrucoes;
}

export function criarEstadoParaNovaEmissaoInter() {
  return {
    interNossoNumero: null,
    interCodigoSolicitacao: null,
    interSeuNumero: null,
    interTxId: null,
    interPixCode: null,
    interBarcode: null,
    interPdfKey: null,
    interStatus: null,
    interOrigemRecebimento: null,
    interDataRecebimento: null,
    interValorRecebido: null,
    status: "PENDENTE" as const,
  };
}
