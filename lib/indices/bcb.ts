import type { CodigoIndiceReajuste } from "./catalogo";
import { obterConfiguracaoIndice } from "./catalogo";

export interface ValorIndiceBcb {
  competencia: Date;
  taxaMensal: string;
}

interface RespostaBcb {
  data: string;
  valor: string;
}

export function parseDataBcb(valor: string): Date {
  const correspondencia = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(valor);
  if (!correspondencia) throw new Error(`Data inválida recebida do BCB: ${valor}`);
  const [, dia, mes, ano] = correspondencia;
  const data = new Date(Date.UTC(Number(ano), Number(mes) - 1, Number(dia)));
  if (
    Number.isNaN(data.getTime())
    || data.getUTCFullYear() !== Number(ano)
    || data.getUTCMonth() !== Number(mes) - 1
    || data.getUTCDate() !== Number(dia)
  ) {
    throw new Error(`Data inválida recebida do BCB: ${valor}`);
  }
  return data;
}

function formatarDataBcb(valor: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(valor);
}

export async function buscarValoresIndiceBcb(
  codigo: CodigoIndiceReajuste,
  dataInicio: Date,
  dataFim: Date,
): Promise<ValorIndiceBcb[]> {
  const { serieBcb } = obterConfiguracaoIndice(codigo);
  const params = new URLSearchParams({
    formato: "json",
    dataInicial: formatarDataBcb(dataInicio),
    dataFinal: formatarDataBcb(dataFim),
  });
  const response = await fetch(
    `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${serieBcb}/dados?${params}`,
    {
      headers: { Accept: "application/json", "User-Agent": "ImobPro/1.0" },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!response.ok) throw new Error(`BCB respondeu HTTP ${response.status}`);

  const resposta = await response.json() as RespostaBcb[];
  if (!Array.isArray(resposta)) throw new Error("Resposta inválida recebida do BCB.");

  return resposta.map((item) => {
    const taxa = Number(item.valor.replace(",", "."));
    if (!Number.isFinite(taxa)) throw new Error(`Taxa inválida recebida do BCB: ${item.valor}`);
    return {
      competencia: parseDataBcb(item.data),
      taxaMensal: taxa.toString(),
    };
  });
}
