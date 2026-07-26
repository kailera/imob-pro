import { prisma } from "@/lib/prisma";
import { buscarValoresIndiceBcb } from "./bcb";
import { calcularVariacaoComposta } from "./calculo";
import {
  INDICES_REAJUSTE,
  type CodigoIndiceReajuste,
} from "./catalogo";

function inicioMes(valor: Date) {
  return new Date(Date.UTC(valor.getUTCFullYear(), valor.getUTCMonth(), 1));
}

export function listarCompetencias(dataInicio: Date, dataFim: Date) {
  const competencias: Date[] = [];
  const cursor = inicioMes(dataInicio);
  const limite = inicioMes(dataFim);
  while (cursor <= limite) {
    competencias.push(new Date(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return competencias;
}

function chaveCompetencia(valor: Date) {
  return valor.toISOString().slice(0, 7);
}

export async function sincronizarIndice(
  codigo: CodigoIndiceReajuste,
  dataInicio: Date,
  dataFim: Date,
) {
  const valores = await buscarValoresIndiceBcb(codigo, dataInicio, dataFim);
  const agora = new Date();
  if (valores.length) {
    await prisma.$transaction(
      valores.map((valor) => prisma.indiceEconomicoValor.upsert({
        where: {
          codigo_competencia: {
            codigo,
            competencia: valor.competencia,
          },
        },
        create: {
          codigo,
          competencia: valor.competencia,
          taxaMensal: valor.taxaMensal,
          fonte: "BCB_SGS",
          consultadoEm: agora,
        },
        update: {
          taxaMensal: valor.taxaMensal,
          fonte: "BCB_SGS",
          consultadoEm: agora,
        },
      })),
    );
  }
  return valores.length;
}

export async function sincronizarIndicesRecentes(meses = 18) {
  const hoje = new Date();
  const fim = inicioMes(hoje);
  const inicio = new Date(Date.UTC(fim.getUTCFullYear(), fim.getUTCMonth() - Math.max(1, meses) + 1, 1));
  const resultados = [];

  for (const indice of INDICES_REAJUSTE) {
    try {
      const valores = await sincronizarIndice(indice.codigo, inicio, fim);
      resultados.push({ codigo: indice.codigo, success: true as const, valores });
    } catch (error: unknown) {
      resultados.push({
        codigo: indice.codigo,
        success: false as const,
        error: error instanceof Error ? error.message : "Falha desconhecida.",
      });
    }
  }
  return resultados;
}

export async function obterVariacaoAcumulada(
  codigo: CodigoIndiceReajuste,
  dataInicio: Date,
  dataFim: Date,
) {
  const competenciasEsperadas = listarCompetencias(dataInicio, dataFim);
  let valores = await prisma.indiceEconomicoValor.findMany({
    where: {
      codigo,
      competencia: { in: competenciasEsperadas },
    },
    orderBy: { competencia: "asc" },
  });
  let sincronizouAgora = false;

  const chavesEncontradas = new Set(valores.map((valor) => chaveCompetencia(valor.competencia)));
  const faltantesAntes = competenciasEsperadas.filter(
    (competencia) => !chavesEncontradas.has(chaveCompetencia(competencia)),
  );

  if (faltantesAntes.length) {
    await sincronizarIndice(codigo, dataInicio, dataFim);
    sincronizouAgora = true;
    valores = await prisma.indiceEconomicoValor.findMany({
      where: {
        codigo,
        competencia: { in: competenciasEsperadas },
      },
      orderBy: { competencia: "asc" },
    });
  }

  const chavesFinais = new Set(valores.map((valor) => chaveCompetencia(valor.competencia)));
  const faltantes = competenciasEsperadas.filter(
    (competencia) => !chavesFinais.has(chaveCompetencia(competencia)),
  );
  if (faltantes.length) {
    const referencias = faltantes.map((data) => chaveCompetencia(data)).join(", ");
    throw new Error(`Faltam competências publicadas para ${codigo}: ${referencias}.`);
  }

  const variacao = calcularVariacaoComposta(valores.map((valor) => valor.taxaMensal.toString()));
  return {
    percentual: variacao.percentual,
    fator: variacao.fator,
    competenciaInicial: valores[0].competencia,
    competenciaFinal: valores[valores.length - 1].competencia,
    taxaFinal: Number(valores[valores.length - 1].taxaMensal),
    consultadoEm: valores.reduce(
      (maisRecente, valor) => valor.consultadoEm > maisRecente ? valor.consultadoEm : maisRecente,
      valores[0].consultadoEm,
    ),
    mesesConsiderados: valores.length,
    fonte: sincronizouAgora ? "BANCO_CENTRAL" as const : "CACHE_BANCO_CENTRAL" as const,
  };
}
