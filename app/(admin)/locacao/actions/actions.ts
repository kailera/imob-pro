"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma"; // Ajuste o caminho conforme a localização do seu Prisma Client configurado
import { INDICES_REAJUSTE, normalizarCodigoIndice } from "@/lib/indices/catalogo";
import { obterVariacaoAcumulada } from "@/lib/indices/service";
import {
    adicionarDiasUTC,
    adicionarMesesUTC,
    calcularPercentualEntreValores,
    calcularIntervaloCompetenciasReajuste,
    datasSaoConsecutivas,
    HISTORICO_STATUS,
    inicioMesUTC,
    normalizarDataUTC,
    proximoMesUTC,
    sugerirLacunaPeriodo,
} from "@/lib/locacao/periodos";
import { calcularMesesContrato, converterMesesParaPercentual, formatarDataLocalISO } from "@/lib/locacao/financeiro";
import { sincronizarCobrancasPendentesDoPeriodo } from "@/lib/locacao/sincronizarCobrancas";
import { requireUserContext } from "@/lib/auth";

type PrismaTransaction = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function sincronizarHistoricoLocacao(tx: PrismaTransaction, imovelLocacaoId: string) {
    const locacao = await tx.imovelLocacao.findUnique({
        where: { id: imovelLocacaoId },
        include: {
            periodos: { orderBy: { dataInicio: "asc" } },
            contratoImovelLocacaos: { select: { id: true } },
        },
    });
    if (!locacao) return;

    const periodos = locacao.periodos;
    let status: string = HISTORICO_STATUS.NAO_INICIADO;
    if (periodos.length > 0) {
        const iniciaComContrato = normalizarDataUTC(periodos[0].dataInicio).getTime()
            === normalizarDataUTC(locacao.dataInicio).getTime();
        const semLacunas = periodos.every((periodo, indice) => (
            indice === 0 || datasSaoConsecutivas(periodos[indice - 1].dataFim, periodo.dataInicio)
        ));
        const possuiProvisorio = periodos.some((periodo) => periodo.origemPeriodo === "SICADI_PROVISORIO");
        const ultimoPeriodo = periodos[periodos.length - 1];
        const cobreAteHoje = normalizarDataUTC(ultimoPeriodo.dataFim).getTime() >= Math.min(
            normalizarDataUTC(new Date()).getTime(),
            normalizarDataUTC(locacao.dataFim).getTime(),
        );

        status = iniciaComContrato && semLacunas && cobreAteHoje && !possuiProvisorio
            ? HISTORICO_STATUS.COMPLETO
            : HISTORICO_STATUS.PARCIAL;

        await tx.imovelLocacao.update({
            where: { id: imovelLocacaoId },
            data: {
                historicoPeriodosStatus: status,
                historicoRevisadoEm: status === HISTORICO_STATUS.COMPLETO ? new Date() : null,
                valorAluguel: ultimoPeriodo.valorAluguel,
                valorTotal: ultimoPeriodo.valorTotal,
                proximoReajuste: normalizarDataUTC(ultimoPeriodo.dataFim) < normalizarDataUTC(locacao.dataFim)
                    ? adicionarDiasUTC(ultimoPeriodo.dataFim, 1)
                    : null,
            },
        });
        const contratoIds = locacao.contratoImovelLocacaos.map((contrato) => contrato.id);
        for (const periodo of periodos) {
            if (periodo.origemPeriodo === "SICADI_PROVISORIO") continue;
            await sincronizarCobrancasPendentesDoPeriodo(tx, {
                contratoIds,
                periodo,
            });
        }
        return;
    }

    await tx.imovelLocacao.update({
        where: { id: imovelLocacaoId },
        data: { historicoPeriodosStatus: status, historicoRevisadoEm: null },
    });
}

function validarDatasPeriodo(dataInicio: Date, dataFim: Date, inicioContrato: Date, fimContrato: Date) {
    if (Number.isNaN(dataInicio.getTime()) || Number.isNaN(dataFim.getTime())) {
        return "As datas do período são inválidas.";
    }
    if (dataInicio > dataFim) return "O início do período não pode ser posterior ao término.";
    if (dataInicio < normalizarDataUTC(inicioContrato) || dataFim > normalizarDataUTC(fimContrato)) {
        return "O período deve estar integralmente dentro da vigência total do contrato.";
    }
    return null;
}

export interface AgendaLocacaoEvento {
    id: string;
    tipo: "REAJUSTE_PERIODO" | "VENCIMENTO_CONTRATO";
    dataEvento: string;
    contratoId: string;
    imovelLocacaoId: string;
    periodoId?: string;
    inquilino: string;
    imovel: string;
    valorAluguel: number | null;
    indiceReajuste: string | null;
    situacao: "A_VENCER" | "ATRASADO" | "TRATADO" | "REVISAR_HISTORICO";
    fonte: "PERIODO_CONFIRMADO" | "SICADI" | "CONTRATO";
    historicoStatus: string;
    locador: string;
    valorReajustado: number | null;
    percentualReajuste: number | null;
    reajusteExecutadoEm: string | null;
    reajusteExecutadoPor: string | null;
    podeReajustar: boolean;
    motivoBloqueio: string | null;
    manterValorDeflacao: boolean;
    sugestaoPeriodo: SugestaoPeriodoAgenda | null;
}

export interface SugestaoPeriodoAgenda {
    dataInicio: string;
    dataFim: string;
    valorAluguel: number;
    indiceReajuste: string;
    diaVencimento: number | null;
    tipoPeriodo: "BASE" | "REAJUSTE";
    manterValorDeflacao: boolean;
    periodoProvisorioId: string | null;
    aviso: string;
}

export interface PainelIndiceReajuste {
    codigo: string;
    nome: string;
    percentualAcumulado: number | null;
    taxaUltimaCompetencia: number | null;
    competenciaInicial: string | null;
    competenciaFinal: string | null;
    mesesConsiderados: number;
    consultadoEm: string | null;
    fonte: "BANCO_CENTRAL" | "CACHE_BANCO_CENTRAL" | null;
    erro: string | null;
}

export const getPainelIndicesReajuste = async (ano: number, mes: number) => {
    if (!Number.isInteger(ano) || !Number.isInteger(mes) || mes < 1 || mes > 12) {
        return { success: false as const, error: "Mês de referência inválido.", data: [] as PainelIndiceReajuste[] };
    }

    try {
        await requireUserContext();
        const dataInicio = new Date(Date.UTC(ano, mes - 1 - 12, 1));
        const dataFim = new Date(Date.UTC(ano, mes - 1, 0));
        const data = await Promise.all(INDICES_REAJUSTE.map(async (indice): Promise<PainelIndiceReajuste> => {
            try {
                const resultado = await obterVariacaoAcumulada(indice.codigo, dataInicio, dataFim);
                return {
                    codigo: indice.codigo,
                    nome: indice.nome,
                    percentualAcumulado: resultado.percentual,
                    taxaUltimaCompetencia: resultado.taxaFinal,
                    competenciaInicial: resultado.competenciaInicial.toISOString(),
                    competenciaFinal: resultado.competenciaFinal.toISOString(),
                    mesesConsiderados: resultado.mesesConsiderados,
                    consultadoEm: resultado.consultadoEm.toISOString(),
                    fonte: resultado.fonte,
                    erro: null,
                };
            } catch (error: unknown) {
                return {
                    codigo: indice.codigo,
                    nome: indice.nome,
                    percentualAcumulado: null,
                    taxaUltimaCompetencia: null,
                    competenciaInicial: dataInicio.toISOString(),
                    competenciaFinal: dataFim.toISOString(),
                    mesesConsiderados: 0,
                    consultadoEm: null,
                    fonte: null,
                    erro: error instanceof Error ? error.message : "Índice indisponível.",
                };
            }
        }));
        return { success: true as const, data };
    } catch (error: unknown) {
        console.error("Erro ao carregar painel de índices:", error);
        return {
            success: false as const,
            error: error instanceof Error ? error.message : "Não foi possível carregar os índices.",
            data: [] as PainelIndiceReajuste[],
        };
    }
};

export const getAgendaVencimentosLocacao = async (ano: number, mes: number) => {
    if (!Number.isInteger(ano) || !Number.isInteger(mes) || mes < 1 || mes > 12) {
        return { success: false as const, error: "Mês de referência inválido.", data: [] as AgendaLocacaoEvento[] };
    }

    const inicio = inicioMesUTC(ano, mes);
    const fimExclusivo = proximoMesUTC(ano, mes);
    const inicioFimPeriodo = adicionarDiasUTC(inicio, -1);
    const fimFimPeriodo = adicionarDiasUTC(fimExclusivo, -1);

    try {
        const { tenantId } = await requireUserContext();
        const locacoes = await prisma.imovelLocacao.findMany({
            where: {
                contratoImovelLocacaos: { some: { imobId: tenantId } },
                OR: [
                    { dataFim: { gte: inicio, lt: fimExclusivo } },
                    { proximoReajuste: { gte: inicio, lt: fimExclusivo } },
                    { periodos: { some: { dataFim: { gte: inicioFimPeriodo, lt: fimFimPeriodo } } } },
                ],
            },
            include: {
                imovel: { select: { descricao: true, codigo: true } },
                contratoImovelLocacaos: {
                    select: { id: true, locatarios: { select: { nome: true }, take: 1 } },
                    take: 1,
                },
                locadors: { select: { nome: true }, take: 1 },
                periodos: { orderBy: { dataInicio: "asc" } },
            },
        });

        const agora = normalizarDataUTC(new Date());
        const eventos: AgendaLocacaoEvento[] = [];

        for (const locacao of locacoes) {
            const contrato = locacao.contratoImovelLocacaos[0];
            if (!contrato) continue;
            const periodosConfirmados = locacao.periodos.filter(
                (periodo) => periodo.origemPeriodo !== "SICADI_PROVISORIO",
            );
            const faixaSugerida = sugerirLacunaPeriodo(
                locacao.dataInicio,
                locacao.dataFim,
                periodosConfirmados,
                locacao.periodicidadeReajuste || 12,
            );
            const periodoProvisorio = locacao.periodos.find(
                (periodo) => periodo.origemPeriodo === "SICADI_PROVISORIO",
            );
            const periodoAnterior = faixaSugerida
                ? [...periodosConfirmados]
                    .filter((periodo) => normalizarDataUTC(periodo.dataFim) < faixaSugerida.dataInicio)
                    .sort((a, b) => b.dataFim.getTime() - a.dataFim.getTime())[0]
                : null;
            const periodoSeguinte = faixaSugerida
                ? periodosConfirmados.find(
                    (periodo) => normalizarDataUTC(periodo.dataInicio) > faixaSugerida.dataFim,
                )
                : null;
            const tipoPeriodoSugerido = faixaSugerida
                && faixaSugerida.dataInicio.getTime() === normalizarDataUTC(locacao.dataInicio).getTime()
                ? "BASE" as const
                : "REAJUSTE" as const;
            const valorSugerido = tipoPeriodoSugerido === "BASE"
                ? periodoSeguinte?.valorAluguelAnterior
                    ?? periodoSeguinte?.valorAluguel
                    ?? periodoProvisorio?.valorAluguel
                    ?? locacao.valorAluguel
                    ?? 0
                : periodoAnterior?.valorAluguel
                    ?? periodoProvisorio?.valorAluguel
                    ?? locacao.valorAluguel
                    ?? 0;
            const sugestaoPeriodo: SugestaoPeriodoAgenda | null = faixaSugerida
                ? {
                    dataInicio: faixaSugerida.dataInicio.toISOString().slice(0, 10),
                    dataFim: faixaSugerida.dataFim.toISOString().slice(0, 10),
                    valorAluguel: valorSugerido,
                    indiceReajuste: normalizarCodigoIndice(
                        periodoAnterior?.indiceReajuste
                        || periodoSeguinte?.indiceReajuste
                        || periodoProvisorio?.indiceReajuste
                        || locacao.indiceReajuste,
                    ) || "IGP-M",
                    diaVencimento: periodoAnterior?.diaVencimento
                        ?? periodoSeguinte?.diaVencimento
                        ?? periodoProvisorio?.diaVencimento
                        ?? locacao.diaVencimento,
                    tipoPeriodo: tipoPeriodoSugerido,
                    manterValorDeflacao: periodoAnterior?.manterValorDeflacao
                        ?? periodoProvisorio?.manterValorDeflacao
                        ?? true,
                    periodoProvisorioId: periodoProvisorio?.id ?? null,
                    aviso: periodoProvisorio
                        ? "O período provisório importado será substituído por este período confirmado."
                        : tipoPeriodoSugerido === "BASE"
                            ? "Confirme o aluguel-base e a primeira faixa de vigência do contrato."
                            : "Esta é a primeira lacuna encontrada no histórico. Confirme os dados antes de salvar.",
                }
                : null;
            const dadosComuns = {
                contratoId: contrato.id,
                imovelLocacaoId: locacao.id,
                inquilino: contrato.locatarios[0]?.nome || "Não informado",
                imovel: locacao.imovel.descricao || locacao.imovel.codigo || "Não informado",
                valorAluguel: locacao.valorAluguel,
                indiceReajuste: locacao.indiceReajuste,
                historicoStatus: locacao.historicoPeriodosStatus,
                locador: locacao.locadors[0]?.nome || "Não informado",
                valorReajustado: null,
                percentualReajuste: null,
                reajusteExecutadoEm: null,
                reajusteExecutadoPor: null,
                podeReajustar: false,
                motivoBloqueio: null,
                manterValorDeflacao: true,
                sugestaoPeriodo,
            };

            const fimContrato = normalizarDataUTC(locacao.dataFim);
            const historicoEstruturalValido = locacao.periodos.length > 0
                && normalizarDataUTC(locacao.periodos[0].dataInicio).getTime()
                    === normalizarDataUTC(locacao.dataInicio).getTime()
                && locacao.periodos.every((periodo, indice) => (
                    periodo.origemPeriodo !== "SICADI_PROVISORIO"
                    && (indice === 0 || datasSaoConsecutivas(locacao.periodos[indice - 1].dataFim, periodo.dataInicio))
                ));
            if (fimContrato >= inicio && fimContrato < fimExclusivo) {
                eventos.push({
                    ...dadosComuns,
                    id: `contrato:${contrato.id}:${fimContrato.toISOString()}`,
                    tipo: "VENCIMENTO_CONTRATO",
                    dataEvento: fimContrato.toISOString(),
                    situacao: fimContrato < agora ? "ATRASADO" : "A_VENCER",
                    fonte: "CONTRATO",
                    motivoBloqueio: "Este item representa o fim da vigência total, não um reajuste periódico.",
                });
            }

            let encontrouPeriodoNoMes = false;
            for (let indice = 0; indice < locacao.periodos.length; indice += 1) {
                const periodo = locacao.periodos[indice];
                const dataReajuste = adicionarDiasUTC(periodo.dataFim, 1);
                if (dataReajuste < inicio || dataReajuste >= fimExclusivo || dataReajuste > fimContrato) continue;

                encontrouPeriodoNoMes = true;
                const sucessor = locacao.periodos[indice + 1];
                const tratado = Boolean(sucessor && datasSaoConsecutivas(periodo.dataFim, sucessor.dataInicio));
                const precisaRevisar = !historicoEstruturalValido
                    || periodo.origemPeriodo === "SICADI_PROVISORIO";
                const indiceDoReajuste = periodo.indiceReajuste || locacao.indiceReajuste;
                const indiceSuportado = normalizarCodigoIndice(indiceDoReajuste);
                eventos.push({
                    ...dadosComuns,
                    id: `periodo:${periodo.id}:${dataReajuste.toISOString()}`,
                    tipo: "REAJUSTE_PERIODO",
                    dataEvento: dataReajuste.toISOString(),
                    periodoId: periodo.id,
                    valorAluguel: periodo.valorAluguel,
                    indiceReajuste: indiceDoReajuste,
                    situacao: tratado ? "TRATADO" : precisaRevisar ? "REVISAR_HISTORICO" : dataReajuste < agora ? "ATRASADO" : "A_VENCER",
                    fonte: precisaRevisar ? "SICADI" : "PERIODO_CONFIRMADO",
                    valorReajustado: sucessor?.valorAluguel ?? null,
                    percentualReajuste: sucessor?.percentualReajuste ?? null,
                    reajusteExecutadoEm: sucessor?.dataCalculoReajuste?.toISOString() ?? null,
                    reajusteExecutadoPor: sucessor?.reajusteExecutadoPorNome ?? null,
                    podeReajustar: !tratado && !precisaRevisar && Boolean(indiceSuportado),
                    motivoBloqueio: tratado
                        ? null
                        : precisaRevisar
                            ? "Revise e complete o histórico de períodos antes de reajustar."
                            : !indiceSuportado
                                ? "Selecione um índice específico e suportado no contrato."
                                : null,
                    manterValorDeflacao: sucessor?.manterValorDeflacao ?? periodo.manterValorDeflacao,
                });
            }

            if (!encontrouPeriodoNoMes && locacao.proximoReajuste) {
                const dataSicadi = normalizarDataUTC(locacao.proximoReajuste);
                if (dataSicadi >= inicio && dataSicadi < fimExclusivo && dataSicadi <= fimContrato) {
                    eventos.push({
                        ...dadosComuns,
                        id: `sicadi:${locacao.id}:${dataSicadi.toISOString()}`,
                        tipo: "REAJUSTE_PERIODO",
                        dataEvento: dataSicadi.toISOString(),
                        situacao: "REVISAR_HISTORICO",
                        fonte: "SICADI",
                        motivoBloqueio: "Revise e complete o histórico de períodos antes de reajustar.",
                    });
                }
            }
        }

        eventos.sort((a, b) => a.dataEvento.localeCompare(b.dataEvento) || a.tipo.localeCompare(b.tipo));
        return { success: true as const, data: eventos };
    } catch (error: unknown) {
        console.error("Erro ao carregar agenda de locações:", error);
        return { success: false as const, error: "Não foi possível carregar a agenda mensal.", data: [] as AgendaLocacaoEvento[] };
    }
};

export const criarPeriodoPelaAgenda = async (input: {
    imovelLocacaoId: string;
    dataInicio: string;
    dataFim: string;
    valorAluguel: number;
    indiceReajuste: string;
    diaVencimento: number | null;
    manterValorDeflacao: boolean;
    periodoProvisorioId: string | null;
}) => {
    try {
        const { tenantId } = await requireUserContext();
        if (!Number.isFinite(input.valorAluguel) || input.valorAluguel <= 0) {
            return { success: false as const, error: "Informe um valor de aluguel maior que zero." };
        }
        if (input.diaVencimento != null && (
            !Number.isInteger(input.diaVencimento)
            || input.diaVencimento < 1
            || input.diaVencimento > 31
        )) {
            return { success: false as const, error: "O dia de vencimento deve estar entre 1 e 31." };
        }

        const indiceReajuste = normalizarCodigoIndice(input.indiceReajuste);
        if (!indiceReajuste) {
            return { success: false as const, error: "Selecione um índice de reajuste suportado." };
        }

        const locacao = await prisma.imovelLocacao.findFirst({
            where: {
                id: input.imovelLocacaoId,
                contratoImovelLocacaos: { some: { imobId: tenantId } },
            },
            include: { periodos: { orderBy: { dataInicio: "asc" } } },
        });
        if (!locacao) {
            return { success: false as const, error: "Contrato de locação não encontrado ou sem acesso." };
        }

        const dataInicio = normalizarDataUTC(input.dataInicio);
        const dataFim = normalizarDataUTC(input.dataFim);
        const erroDatas = validarDatasPeriodo(dataInicio, dataFim, locacao.dataInicio, locacao.dataFim);
        if (erroDatas) return { success: false as const, error: erroDatas };

        const periodoProvisorio = input.periodoProvisorioId
            ? locacao.periodos.find(
                (periodo) => periodo.id === input.periodoProvisorioId
                    && periodo.origemPeriodo === "SICADI_PROVISORIO",
            )
            : null;
        if (input.periodoProvisorioId && !periodoProvisorio) {
            return { success: false as const, error: "O período provisório informado não está mais disponível." };
        }

        const periodosComparacao = locacao.periodos.filter(
            (periodo) => periodo.id !== periodoProvisorio?.id,
        );
        const possuiSobreposicao = periodosComparacao.some((periodo) => (
            dataInicio <= normalizarDataUTC(periodo.dataFim)
            && dataFim >= normalizarDataUTC(periodo.dataInicio)
        ));
        if (possuiSobreposicao) {
            return { success: false as const, error: "A vigência informada sobrepõe outro período do contrato." };
        }

        const periodoAnterior = [...periodosComparacao]
            .filter((periodo) => normalizarDataUTC(periodo.dataFim) < dataInicio)
            .sort((a, b) => b.dataFim.getTime() - a.dataFim.getTime())[0];
        const tipoPeriodo = dataInicio.getTime() === normalizarDataUTC(locacao.dataInicio).getTime()
            ? "BASE"
            : "REAJUSTE";
        if (tipoPeriodo === "REAJUSTE" && !periodoAnterior) {
            return {
                success: false as const,
                error: "Cadastre primeiro o período-base que começa junto com a vigência do contrato.",
            };
        }

        const modeloFinanceiro = periodoAnterior || periodoProvisorio;
        const valorCondominio = modeloFinanceiro?.valorCondominio || 0;
        const valorIPTU = modeloFinanceiro?.valorIPTU || 0;
        const percentualReajuste = tipoPeriodo === "REAJUSTE" && periodoAnterior
            ? calcularPercentualEntreValores(periodoAnterior.valorAluguel, input.valorAluguel)
            : null;
        const dadosPeriodo = {
            dataInicio,
            dataFim,
            valorAluguel: input.valorAluguel,
            hasCondominio: modeloFinanceiro?.hasCondominio ?? locacao.hasCondominio,
            valorCondominio,
            hasIPTU: modeloFinanceiro?.hasIPTU ?? locacao.hasIPTU,
            valorIPTU,
            valorTotal: input.valorAluguel + valorCondominio + valorIPTU,
            descontoPontualidade: modeloFinanceiro?.descontoPontualidade ?? locacao.descontoPontualidade,
            tipoDesconto: modeloFinanceiro?.tipoDesconto ?? locacao.tipoDesconto,
            diasAntecedenciaDesc: modeloFinanceiro?.diasAntecedenciaDesc ?? locacao.diasAntecedenciaDesc,
            multaAtrasoPercentual: modeloFinanceiro?.multaAtrasoPercentual ?? locacao.multaAtrasoPercentual,
            diasCarenciaMulta: modeloFinanceiro?.diasCarenciaMulta ?? locacao.diasCarenciaMulta,
            jurosAtrasoPercentual: modeloFinanceiro?.jurosAtrasoPercentual ?? locacao.jurosAtrasoPercentual,
            diasCarenciaJuros: modeloFinanceiro?.diasCarenciaJuros ?? locacao.diasCarenciaJuros,
            indiceReajuste,
            valorAluguelAnterior: tipoPeriodo === "REAJUSTE" ? periodoAnterior?.valorAluguel : null,
            percentualReajuste,
            reajusteAutomatico: false,
            manterValorDeflacao: input.manterValorDeflacao,
            dataCalculoReajuste: percentualReajuste != null ? new Date() : null,
            reajusteExecutadoPorId: null,
            reajusteExecutadoPorNome: null,
            tipoPeriodo,
            origemPeriodo: "MANUAL",
            diaVencimento: input.diaVencimento,
        };

        const periodo = await prisma.$transaction(async (tx) => {
            const salvo = periodoProvisorio
                ? await tx.periodoContratoLocacao.update({
                    where: { id: periodoProvisorio.id },
                    data: dadosPeriodo,
                })
                : await tx.periodoContratoLocacao.create({
                    data: {
                        imovelLocacaoId: locacao.id,
                        ...dadosPeriodo,
                    },
                });
            await sincronizarHistoricoLocacao(tx, locacao.id);
            return salvo;
        });

        revalidatePath("/locacao");
        return {
            success: true as const,
            data: {
                id: periodo.id,
                tipoPeriodo,
                substituiuProvisorio: Boolean(periodoProvisorio),
            },
        };
    } catch (error: unknown) {
        console.error("Erro ao criar período pela agenda:", error);
        return {
            success: false as const,
            error: error instanceof Error ? error.message : "Não foi possível criar o período.",
        };
    }
};

export const calcularIndiceReajuste = async (indice: string, dataInicio: string, dataFim: string) => {
    const indiceNormalizado = normalizarCodigoIndice(indice);
    if (!indiceNormalizado) {
        return { success: false as const, error: "Índice não disponível para cálculo automático." };
    }
    const intervaloCompetencias = calcularIntervaloCompetenciasReajuste(dataInicio, dataFim);
    try {
        const resultado = await obterVariacaoAcumulada(
            indiceNormalizado,
            intervaloCompetencias.dataInicio,
            intervaloCompetencias.dataFim,
        );
        return {
            success: true as const,
            percentual: resultado.percentual,
            competenciaInicial: resultado.competenciaInicial.toLocaleDateString("pt-BR", { timeZone: "UTC" }),
            competenciaFinal: resultado.competenciaFinal.toLocaleDateString("pt-BR", { timeZone: "UTC" }),
            mesesConsiderados: resultado.mesesConsiderados,
            fonte: resultado.fonte,
        };
    } catch (error: unknown) {
        console.error("Erro ao calcular índice de reajuste:", error);
        return { success: false, error: error instanceof Error ? error.message : "Não foi possível consultar o índice." };
    }
};

export interface OpcoesReajusteAgenda {
    indice?: string;
    percentualManual?: number | null;
    valorManual?: number | null;
}

export const executarReajusteAutomatico = async (
    periodoId: string,
    opcoes: OpcoesReajusteAgenda = {},
) => {
    if (!periodoId?.trim()) {
        return { success: false as const, error: "Período de referência inválido." };
    }

    try {
        const { tenantId, userId, user } = await requireUserContext();
        const periodoAnterior = await prisma.periodoContratoLocacao.findFirst({
            where: {
                id: periodoId,
                imovelLocacao: {
                    contratoImovelLocacaos: { some: { imobId: tenantId } },
                },
            },
            include: {
                imovelLocacao: {
                    include: { periodos: { orderBy: { dataInicio: "asc" } } },
                },
            },
        });

        if (!periodoAnterior) {
            return { success: false as const, error: "Período não encontrado ou sem acesso." };
        }

        const locacao = periodoAnterior.imovelLocacao;
        const historicoEstruturalValido = locacao.periodos.length > 0
            && normalizarDataUTC(locacao.periodos[0].dataInicio).getTime()
                === normalizarDataUTC(locacao.dataInicio).getTime()
            && locacao.periodos.every((periodo, indicePeriodo) => (
                periodo.origemPeriodo !== "SICADI_PROVISORIO"
                && (indicePeriodo === 0
                    || datasSaoConsecutivas(locacao.periodos[indicePeriodo - 1].dataFim, periodo.dataInicio))
            ));
        const ultimoPeriodo = locacao.periodos.at(-1);
        if (!historicoEstruturalValido || ultimoPeriodo?.id !== periodoAnterior.id) {
            return {
                success: false as const,
                error: "Complete e revise o histórico de períodos antes de executar o reajuste automático.",
            };
        }

        const dataInicioNovoPeriodo = adicionarDiasUTC(periodoAnterior.dataFim, 1);
        const fimContrato = normalizarDataUTC(locacao.dataFim);
        if (dataInicioNovoPeriodo > fimContrato) {
            return { success: false as const, error: "O contrato já chegou ao fim da vigência." };
        }

        const indice = normalizarCodigoIndice(
            opcoes.indice || periodoAnterior.indiceReajuste || locacao.indiceReajuste,
        );
        if (!indice) {
            return { success: false as const, error: "Defina um índice oficial compatível antes de reajustar." };
        }

        const manterValorDeflacao = periodoAnterior.manterValorDeflacao;
        const ajusteManual = opcoes.percentualManual != null || opcoes.valorManual != null;
        let percentualAplicado: number;
        let novoValorAluguel: number;
        let fonteCalculo: string;

        if (ajusteManual) {
            if (opcoes.valorManual != null) {
                if (!Number.isFinite(opcoes.valorManual) || opcoes.valorManual <= 0) {
                    return { success: false as const, error: "Informe um valor corrigido maior que zero." };
                }
                novoValorAluguel = Number(opcoes.valorManual.toFixed(2));
                percentualAplicado = Number(
                    (((novoValorAluguel / periodoAnterior.valorAluguel) - 1) * 100).toFixed(4),
                );
            } else {
                if (
                    opcoes.percentualManual == null
                    || !Number.isFinite(opcoes.percentualManual)
                    || opcoes.percentualManual <= -100
                ) {
                    return { success: false as const, error: "Informe um percentual manual válido." };
                }
                percentualAplicado = Number(opcoes.percentualManual.toFixed(4));
                novoValorAluguel = Number(
                    (periodoAnterior.valorAluguel * (1 + percentualAplicado / 100)).toFixed(2),
                );
            }
            fonteCalculo = "MANUAL";
        } else {
            const calculo = await calcularIndiceReajuste(
                indice,
                normalizarDataUTC(periodoAnterior.dataInicio).toISOString().slice(0, 10),
                normalizarDataUTC(periodoAnterior.dataFim).toISOString().slice(0, 10),
            );
            if (!calculo.success || calculo.percentual === undefined) {
                return {
                    success: false as const,
                    error: calculo.error || "Não foi possível calcular o índice do período.",
                };
            }
            percentualAplicado = calculo.percentual;
            const valorCalculado = percentualAplicado < 0 && manterValorDeflacao
                ? periodoAnterior.valorAluguel
                : periodoAnterior.valorAluguel * (1 + percentualAplicado / 100);
            novoValorAluguel = Number(valorCalculado.toFixed(2));
            fonteCalculo = calculo.fonte;
        }
        const periodicidade = Math.max(1, locacao.periodicidadeReajuste || 12);
        const fimCalculado = adicionarDiasUTC(adicionarMesesUTC(dataInicioNovoPeriodo, periodicidade), -1);
        const dataFimNovoPeriodo = fimCalculado > fimContrato ? fimContrato : fimCalculado;
        const executadoPorNome = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email;

        const novoPeriodo = await prisma.$transaction(async (tx) => {
            const sucessorExistente = await tx.periodoContratoLocacao.findFirst({
                where: {
                    imovelLocacaoId: locacao.id,
                    dataInicio: dataInicioNovoPeriodo,
                },
            });
            if (sucessorExistente) {
                throw new Error("Este reajuste já foi executado.");
            }

            const criado = await tx.periodoContratoLocacao.create({
                data: {
                    imovelLocacaoId: locacao.id,
                    dataInicio: dataInicioNovoPeriodo,
                    dataFim: dataFimNovoPeriodo,
                    valorAluguel: novoValorAluguel,
                    hasCondominio: periodoAnterior.hasCondominio,
                    valorCondominio: periodoAnterior.valorCondominio,
                    hasIPTU: periodoAnterior.hasIPTU,
                    valorIPTU: periodoAnterior.valorIPTU,
                    valorTotal: novoValorAluguel
                        + (periodoAnterior.valorCondominio || 0)
                        + (periodoAnterior.valorIPTU || 0),
                    descontoPontualidade: periodoAnterior.descontoPontualidade,
                    tipoDesconto: periodoAnterior.tipoDesconto,
                    diasAntecedenciaDesc: periodoAnterior.diasAntecedenciaDesc,
                    multaAtrasoPercentual: periodoAnterior.multaAtrasoPercentual,
                    diasCarenciaMulta: periodoAnterior.diasCarenciaMulta,
                    jurosAtrasoPercentual: periodoAnterior.jurosAtrasoPercentual,
                    diasCarenciaJuros: periodoAnterior.diasCarenciaJuros,
                    indiceReajuste: indice,
                    valorAluguelAnterior: periodoAnterior.valorAluguel,
                    percentualReajuste: percentualAplicado,
                    reajusteAutomatico: !ajusteManual,
                    manterValorDeflacao,
                    dataCalculoReajuste: new Date(),
                    reajusteExecutadoPorId: userId,
                    reajusteExecutadoPorNome: executadoPorNome,
                    tipoPeriodo: "REAJUSTE",
                    origemPeriodo: ajusteManual ? "MANUAL" : "CALCULO_SISTEMA",
                    diaVencimento: periodoAnterior.diaVencimento || locacao.diaVencimento,
                },
            });
            await sincronizarHistoricoLocacao(tx, locacao.id);
            return criado;
        });

        revalidatePath("/locacao");
        return {
            success: true as const,
            data: {
                periodoId: novoPeriodo.id,
                valorAnterior: periodoAnterior.valorAluguel,
                valorReajustado: novoPeriodo.valorAluguel,
                percentualReajuste: percentualAplicado,
                indice,
                executadoEm: novoPeriodo.dataCalculoReajuste?.toISOString() || new Date().toISOString(),
                executadoPor: executadoPorNome,
                fonte: fonteCalculo,
            },
        };
    } catch (error: unknown) {
        console.error("Erro ao executar reajuste automático:", error);
        return {
            success: false as const,
            error: error instanceof Error ? error.message : "Não foi possível executar o reajuste automático.",
        };
    }
};
import {
    TipoVistoria,
    TipoImovelVistoriado,
    VistoriaStatus,
    LimpezaStatus
} from "@/generated/prisma"; // Ou de '@prisma/client' caso use o output padrão

// Definição dos dados que a action espera receber
export interface CreateVistoriaInput {
    data: Date | string;
    tipoVistoria: TipoVistoria;
    tipoImovelVistoriado: TipoImovelVistoriado;
    observacoes: string;
    operadorId: string;
    vistoriadorId: string;
    imovelId: string;

    // Opcionais/Campos de Abas Adicionais
    chavesQuantidade?: number;
    chavesObservacao?: string;

    medidorAguaNumero?: string;
    medidorAguaLeitura?: string;
    medidorAguaFotoUrl?: string;

    medidorLuzNumero?: string;
    medidorLuzLeitura?: string;
    medidorLuzFotoUrl?: string;

    reparosNecessarios?: string;

    limpezaStatus?: LimpezaStatus;
    limpezaObservacao?: string;

    latitude?: number;
    longitude?: number;

    // Opcional: Se já quiser inicializar a vistoria com ambientes padrão pré-cadastrados (ex: Fachada, Sala, Cozinha)
    ambientesPadrao?: string[];
}

export async function createVistoria(input: CreateVistoriaInput) {
    try {
        // 1. Validação básica (garantindo IDs obrigatórios e consistência)
        if (!input.imovelId || !input.operadorId || !input.vistoriadorId) {
            return {
                success: false,
                error: "Os campos de imóvel, operador e vistoriador são obrigatórios.",
            };
        }

        // 2. Criação do registro utilizando transações do Prisma
        const novaVistoria = await prisma.$transaction(async (tx: any) => {
            // Cria a vistoria principal
            const vistoria = await tx.vistoria.create({
                data: {
                    data: new Date(input.data),
                    tipo: input.tipoVistoria,
                    tipoImovelVistoriado: input.tipoImovelVistoriado,
                    status: VistoriaStatus.NAO_INICIADA, // Todo fluxo novo se inicia neste status
                    observacoes: input.observacoes || "",

                    // Relacionamentos obrigatórios
                    imovelId: input.imovelId,
                    operadorId: input.operadorId,
                    vistoriadorId: input.vistoriadorId,

                    // Informações de controle adicionais
                    chavesQuantidade: input.chavesQuantidade ?? null,
                    chavesObservacao: input.chavesObservacao ?? null,

                    medidorAguaNumero: input.medidorAguaNumero ?? null,
                    medidorAguaLeitura: input.medidorAguaLeitura ?? null,
                    medidorAguaFotoUrl: input.medidorAguaFotoUrl ?? null,

                    medidorLuzNumero: input.medidorLuzNumero ?? null,
                    medidorLuzLeitura: input.medidorLuzLeitura ?? null,
                    medidorLuzFotoUrl: input.medidorLuzFotoUrl ?? null,

                    reparosNecessarios: input.reparosNecessarios ?? null,

                    limpezaStatus: input.limpezaStatus ?? null,
                    limpezaObservacao: input.limpezaObservacao ?? null,

                    latitude: input.latitude ?? null,
                    longitude: input.longitude ?? null,
                },
            });

            // 3. Opcional: Se ambientesPadrao forem fornecidos (ex: ['Sala', 'Cozinha', 'Banheiro']),
            // nós os criamos automaticamente para poupar o vistoriador de cadastrar tudo manualmente.
            if (input.ambientesPadrao && input.ambientesPadrao.length > 0) {
                for (let i = 0; i < input.ambientesPadrao.length; i++) {
                    const nomeAmbiente = input.ambientesPadrao[i];

                    // Cria o ambiente
                    const ambiente = await tx.ambienteVistoria.create({
                        data: {
                            nome: nomeAmbiente,
                            ordem: i,
                            vistoriaId: vistoria.id,
                        },
                    });

                    // Cria os itens padrão básicos para esse ambiente (Ex: "Paredes", "Piso", "Portas e Janelas")
                    const itensPadrao = ["Piso", "Paredes", "Teto", "Portas e Janelas", "Instalações Elétricas"];
                    await tx.itemAmbiente.createMany({
                        data: itensPadrao.map((itemNome, itemIndex) => ({
                            nome: itemNome,
                            ordem: itemIndex,
                            statusVerificacao: "PENDENTE",
                            ambienteVistoriaId: ambiente.id,
                        })),
                    });
                }
            }

            return vistoria;
        });

        // 4. Revalida o cache da rota de listagem de vistorias
        revalidatePath("/vistorias");

        return {
            success: true,
            data: novaVistoria,
        };
    } catch (error: any) {
        console.error("Erro ao criar vistoria via Prisma:", error);
        return {
            success: false,
            error: error.message || "Erro desconhecido ao cadastrar a vistoria.",
        };
    }
}

export const getCompleteContratoLocacao = async (id: string) => {
    const contrato = await prisma.contratoImovelLocacao.findUnique({
        where: { id },
        include: {
            // 1. Trazemos o imóvel e apenas as vistorias dele
            imovel: {
                include: {
                    vistorias: {
                        include: {
                            vistoriador: true,
                            operador: true,
                        },
                        orderBy: {
                            data: "desc",
                        },
                    },
                },
            },
            // 2. NOVA ABORDAGEM: Em vez de trazer tudo pelo 'imovel', 
            // trazemos diretamente a locação específica atrelada a este contrato
            imovelLocacao: {
                include: {
                    locadors: true,
                    periodos: {
                        orderBy: {
                            dataInicio: "asc",
                        },
                    },
                    parcelasIntermediacao: {
                        orderBy: { ordem: "asc" },
                    },
                },
            },
            // 3. Trazemos as outras relações normalmente
            locatarios: true,
            fiadors: true,
            transacaoFinanceiras: {
                orderBy: {
                    dataVencimento: "asc",
                },
            },
        },
    });

    return contrato;
};

export const getContratosLocacao = async () => {
    try {
        const context = await requireUserContext();
        const [contratos, leases] = await Promise.all([
          prisma.contratoImovelLocacao.findMany({
            where: { imobId: context.tenantId },
            include: {
                imovel: {
                    include: {
                        imovelLocacaos: {
                            include: {
                                locadors: true,
                                periodos: {
                                    orderBy: {
                                        dataInicio: "asc",
                                    },
                                },
                            }
                        }
                    },
                },
                imovelLocacao: {
                    include: {
                        locadors: true,
                        periodos: {
                            orderBy: {
                                dataInicio: "asc",
                            },
                        },
                    }
                },
                locatarios: true,
                fiadors: true,
            },
            orderBy: {
                id: "desc",
            },
          }),
          prisma.lease.findMany({
            where: { tenantId: context.tenantId },
            include: {
              property: true,
              parties: {
                where: { role: "TENANT" },
                include: { person: true },
                orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
              },
              termsPeriods: { orderBy: { effectiveFrom: "asc" } },
            },
            orderBy: { updatedAt: "desc" },
          }),
        ]);

        const leasesNormalizados = leases.map(lease => ({
          id: lease.id,
          code: lease.code,
          legacyCode: lease.legacyCode,
          status: lease.status,
          startDate: lease.startDate,
          endDate: lease.endDate,
          recordType: "LEASE" as const,
          locatarios: lease.parties.map(party => ({ nome: party.person.name })),
          imovel: lease.property,
          termsPeriods: lease.termsPeriods.map(period => ({
            id: period.id,
            effectiveFrom: period.effectiveFrom,
            effectiveTo: period.effectiveTo,
            rentAmount: Number(period.rentAmount),
            reviewStatus: period.reviewStatus,
          })),
        }));
        const contratosLegados = contratos.map(contrato => ({
          ...contrato,
          recordType: "LEGACY" as const,
        }));

        return { success: true, data: [...leasesNormalizados, ...contratosLegados] };
    } catch (error: any) {
        console.error("Erro ao carregar contratos:", error);
        return { success: false, error: error.message || "Erro ao carregar contratos." };
    }
};

export const getCobrancas = async () => {
    try {
        const cobrancas = await prisma.transacaoFinanceira.findMany({
            where: {
                tipo: "RECEITA",
            },
            include: {
                contrato: true
            }
        });
        return { success: true, data: cobrancas };
    } catch (error: any) {
        console.error("Erro ao carregar cobranças:", error);
        return { success: false, error: error.message || "Erro ao carregar cobranças." };
    }
};

// Adicionar um novo sub-período
export const addPeriodoContratoLocacao = async (input: {
    imovelLocacaoId: string;
    dataInicio: string;
    dataFim: string;
    valorAluguel: number;
    hasCondominio: boolean;
    valorCondominio: number;
    hasIPTU: boolean;
    valorIPTU: number;
    descontoPontualidade?: number | null;
    tipoDesconto?: string | null;
    diasAntecedenciaDesc?: number | null;
    multaAtrasoPercentual?: number | null;
    diasCarenciaMulta?: number | null;
    jurosAtrasoPercentual?: number | null;
    diasCarenciaJuros?: number | null;
    indiceReajuste?: string | null;
    valorAluguelAnterior?: number | null;
    percentualReajuste?: number | null;
    reajusteAutomatico?: boolean;
    manterValorDeflacao?: boolean;
    tipoPeriodo?: "BASE" | "REAJUSTE";
    diaVencimento?: number | null;
}) => {
    try {
        const dataInicioObj = normalizarDataUTC(input.dataInicio);
        const dataFimObj = normalizarDataUTC(input.dataFim);

        const locacao = await prisma.imovelLocacao.findUnique({
            where: { id: input.imovelLocacaoId },
            select: { dataInicio: true, dataFim: true },
        });
        if (!locacao) return { success: false, error: "Contrato de locação não encontrado." };
        const erroDatas = validarDatasPeriodo(dataInicioObj, dataFimObj, locacao.dataInicio, locacao.dataFim);
        if (erroDatas) return { success: false, error: erroDatas };

        // Validar sobreposição de datas
        const periodosExistentes = await prisma.periodoContratoLocacao.findMany({
            where: { imovelLocacaoId: input.imovelLocacaoId },
        });

        for (const p of periodosExistentes) {
            const pInicio = new Date(p.dataInicio);
            const pFim = new Date(p.dataFim);

            if (
                (dataInicioObj >= pInicio && dataInicioObj <= pFim) ||
                (dataFimObj >= pInicio && dataFimObj <= pFim) ||
                (pInicio >= dataInicioObj && pInicio <= dataFimObj)
            ) {
                return { success: false, error: "A vigência deste período sobrepõe-se a um período existente." };
            }
        }

        const percentualInformado = input.percentualReajuste ?? calcularPercentualEntreValores(
            input.valorAluguelAnterior || 0,
            input.valorAluguel,
        );

        const novoPeriodo = await prisma.$transaction(async (tx) => {
            const criado = await tx.periodoContratoLocacao.create({ data: {
                imovelLocacaoId: input.imovelLocacaoId,
                dataInicio: dataInicioObj,
                dataFim: dataFimObj,
                valorAluguel: input.valorAluguel,
                hasCondominio: input.hasCondominio,
                valorCondominio: input.valorCondominio,
                hasIPTU: input.hasIPTU,
                valorIPTU: input.valorIPTU,
                valorTotal: input.valorAluguel + input.valorCondominio + input.valorIPTU,
                descontoPontualidade: input.descontoPontualidade,
                tipoDesconto: input.tipoDesconto,
                diasAntecedenciaDesc: input.diasAntecedenciaDesc,
                multaAtrasoPercentual: input.multaAtrasoPercentual,
                diasCarenciaMulta: input.diasCarenciaMulta,
                jurosAtrasoPercentual: input.jurosAtrasoPercentual,
                diasCarenciaJuros: input.diasCarenciaJuros,
                indiceReajuste: input.indiceReajuste,
                valorAluguelAnterior: input.valorAluguelAnterior,
                percentualReajuste: percentualInformado,
                reajusteAutomatico: input.reajusteAutomatico ?? false,
                manterValorDeflacao: input.manterValorDeflacao ?? true,
                dataCalculoReajuste: percentualInformado != null ? new Date() : null,
                tipoPeriodo: periodosExistentes.length === 0 ? "BASE" : (input.tipoPeriodo || "REAJUSTE"),
                origemPeriodo: "MANUAL",
                diaVencimento: input.diaVencimento,
            } });
            await sincronizarHistoricoLocacao(tx, input.imovelLocacaoId);
            return criado;
        });

        revalidatePath("/locacao");
        return { success: true, data: novoPeriodo };
    } catch (error: any) {
        console.error("Erro ao adicionar período:", error);
        return { success: false, error: error.message || "Erro ao adicionar período." };
    }
};

// Editar um período existente
export const updatePeriodoContratoLocacao = async (id: string, input: {
    dataInicio: string;
    dataFim: string;
    valorAluguel: number;
    hasCondominio: boolean;
    valorCondominio: number;
    hasIPTU: boolean;
    valorIPTU: number;
    descontoPontualidade?: number | null;
    tipoDesconto?: string | null;
    diasAntecedenciaDesc?: number | null;
    multaAtrasoPercentual?: number | null;
    diasCarenciaMulta?: number | null;
    jurosAtrasoPercentual?: number | null;
    diasCarenciaJuros?: number | null;
    indiceReajuste?: string | null;
    valorAluguelAnterior?: number | null;
    percentualReajuste?: number | null;
    reajusteAutomatico?: boolean;
    manterValorDeflacao?: boolean;
    tipoPeriodo?: "BASE" | "REAJUSTE";
    diaVencimento?: number | null;
}) => {
    try {
        const dataInicioObj = normalizarDataUTC(input.dataInicio);
        const dataFimObj = normalizarDataUTC(input.dataFim);

        // Obter o período atual
        const periodoAtual = await prisma.periodoContratoLocacao.findUnique({
            where: { id },
        });

        if (!periodoAtual) {
            return { success: false, error: "Período não encontrado." };
        }

        const locacao = await prisma.imovelLocacao.findUnique({
            where: { id: periodoAtual.imovelLocacaoId },
            select: { dataInicio: true, dataFim: true },
        });
        if (!locacao) return { success: false, error: "Contrato de locação não encontrado." };
        const erroDatas = validarDatasPeriodo(dataInicioObj, dataFimObj, locacao.dataInicio, locacao.dataFim);
        if (erroDatas) return { success: false, error: erroDatas };

        // Validar sobreposição de datas com outros períodos
        const periodosExistentes = await prisma.periodoContratoLocacao.findMany({
            where: { 
                imovelLocacaoId: periodoAtual.imovelLocacaoId,
                id: { not: id }
            },
        });

        for (const p of periodosExistentes) {
            const pInicio = new Date(p.dataInicio);
            const pFim = new Date(p.dataFim);

            if (
                (dataInicioObj >= pInicio && dataInicioObj <= pFim) ||
                (dataFimObj >= pInicio && dataFimObj <= pFim) ||
                (pInicio >= dataInicioObj && pInicio <= dataFimObj)
            ) {
                return { success: false, error: "A vigência deste período sobrepõe-se a um período existente." };
            }
        }

        const percentualInformado = input.percentualReajuste ?? calcularPercentualEntreValores(
            input.valorAluguelAnterior || 0,
            input.valorAluguel,
        );

        const periodoAtualizado = await prisma.$transaction(async (tx) => {
            const atualizado = await tx.periodoContratoLocacao.update({ where: { id }, data: {
                dataInicio: dataInicioObj,
                dataFim: dataFimObj,
                valorAluguel: input.valorAluguel,
                hasCondominio: input.hasCondominio,
                valorCondominio: input.valorCondominio,
                hasIPTU: input.hasIPTU,
                valorIPTU: input.valorIPTU,
                valorTotal: input.valorAluguel + input.valorCondominio + input.valorIPTU,
                descontoPontualidade: input.descontoPontualidade,
                tipoDesconto: input.tipoDesconto,
                diasAntecedenciaDesc: input.diasAntecedenciaDesc,
                multaAtrasoPercentual: input.multaAtrasoPercentual,
                diasCarenciaMulta: input.diasCarenciaMulta,
                jurosAtrasoPercentual: input.jurosAtrasoPercentual,
                diasCarenciaJuros: input.diasCarenciaJuros,
                indiceReajuste: input.indiceReajuste,
                valorAluguelAnterior: input.valorAluguelAnterior,
                percentualReajuste: percentualInformado,
                reajusteAutomatico: input.reajusteAutomatico ?? false,
                manterValorDeflacao: input.manterValorDeflacao ?? true,
                dataCalculoReajuste: percentualInformado != null ? new Date() : null,
                tipoPeriodo: input.tipoPeriodo || periodoAtual.tipoPeriodo,
                origemPeriodo: "MANUAL",
                diaVencimento: input.diaVencimento,
            } });
            await sincronizarHistoricoLocacao(tx, periodoAtual.imovelLocacaoId);
            return atualizado;
        });

        revalidatePath("/locacao");
        return { success: true, data: periodoAtualizado };
    } catch (error: any) {
        console.error("Erro ao atualizar período:", error);
        return { success: false, error: error.message || "Erro ao atualizar período." };
    }
};

// Excluir um período
export const deletePeriodoContratoLocacao = async (id: string) => {
    try {
        await prisma.$transaction(async (tx) => {
            const periodo = await tx.periodoContratoLocacao.delete({ where: { id } });
            await sincronizarHistoricoLocacao(tx, periodo.imovelLocacaoId);
        });
        revalidatePath("/locacao");
        return { success: true };
    } catch (error: any) {
        console.error("Erro ao excluir período:", error);
        return { success: false, error: error.message || "Erro ao excluir período." };
    }
};

export const updateImovelLocacao = async (id: string, input: {
    dataInicio: string;
    dataFim: string;
    hasCondominio: boolean;
    hasIPTU: boolean;
    taxaAdministracao?: number | null;
    taxaMultasEncargos?: number | null;
    taxaIntermediacao?: number | null;
    irrfResponsabilidade?: string | null;
    carenciaRepasse?: number | null;
    diaVencimento?: number | null;
    periodicidadeReajuste?: number | null;
    indiceReajuste?: string | null;
    multaQuebraContrato?: number | null;
    tipoMultaQuebra?: string | null;
    multaQuebraProporcional?: boolean;
    vencimentoQuebra?: string | null;
    descontoPontualidade?: number | null;
    tipoDesconto?: string | null;
    diasAntecedenciaDesc?: number | null;
    multaAtrasoPercentual?: number | null;
    diasCarenciaMulta?: number | null;
    jurosAtrasoPercentual?: number | null;
    diasCarenciaJuros?: number | null;
    honorariosAdvPercentual?: number | null;
    carenciaHonorariosDias?: number | null;
    periodoGarantido?: string | null;
    abrangenciaGarantia?: string | null;
    parcelasIntermediacao?: Array<{
        dataVencimento: string;
        valor: number;
        observacao?: string | null;
    }>;
}) => {
    try {
        const dataInicio = normalizarDataUTC(input.dataInicio);
        const dataFim = normalizarDataUTC(input.dataFim);
        if (dataInicio > dataFim) {
            return { success: false, error: "O início do contrato não pode ser posterior ao término." };
        }
        if (input.diaVencimento != null && (input.diaVencimento < 1 || input.diaVencimento > 31)) {
            return { success: false, error: "O dia de vencimento deve estar entre 1 e 31." };
        }
        const camposPercentuais = [
            input.taxaAdministracao,
            input.taxaMultasEncargos,
            input.multaAtrasoPercentual,
            input.jurosAtrasoPercentual,
            input.honorariosAdvPercentual,
        ];
        if (camposPercentuais.some((valor) => valor != null && valor < 0)) {
            return { success: false, error: "Percentuais não podem ser negativos." };
        }
        const prazoTotalMeses = calcularMesesContrato(dataInicio, dataFim);
        const multaQuebraPercentual = input.multaQuebraContrato == null
            ? null
            : input.tipoMultaQuebra === "MESES"
                ? converterMesesParaPercentual(input.multaQuebraContrato, prazoTotalMeses)
                : input.multaQuebraContrato;
        if (multaQuebraPercentual != null && multaQuebraPercentual < 0) {
            return { success: false, error: "A multa por quebra não pode ser negativa." };
        }
        if (input.descontoPontualidade != null && input.descontoPontualidade < 0) {
            return { success: false, error: "O desconto de pontualidade não pode ser negativo." };
        }
        if (input.parcelasIntermediacao?.some((parcela) => parcela.valor < 0 || !parcela.dataVencimento)) {
            return { success: false, error: "As parcelas de intermediação precisam de vencimento e valor não negativo." };
        }
        const periodoForaDaVigencia = await prisma.periodoContratoLocacao.findFirst({
            where: {
                imovelLocacaoId: id,
                OR: [{ dataInicio: { lt: dataInicio } }, { dataFim: { gt: dataFim } }],
            },
        });
        if (periodoForaDaVigencia) {
            return { success: false, error: "A nova vigência deixaria um período locatício fora do contrato. Ajuste o histórico primeiro." };
        }

        const updated = await prisma.$transaction(async (tx) => {
            const locacaoAtualizada = await tx.imovelLocacao.update({ where: { id }, data: {
                dataInicio,
                dataFim,
                hasCondominio: input.hasCondominio,
                hasIPTU: input.hasIPTU,
                taxaAdministracao: input.taxaAdministracao,
                taxaMultasEncargos: input.taxaMultasEncargos,
                taxaIntermediacao: input.taxaIntermediacao,
                irrfResponsabilidade: input.irrfResponsabilidade,
                carenciaRepasse: input.carenciaRepasse,
                diaVencimento: input.diaVencimento,
                vencimentoOrigem: input.diaVencimento ? "MANUAL" : "NAO_DEFINIDO",
                periodicidadeReajuste: input.periodicidadeReajuste,
                indiceReajuste: input.indiceReajuste,
                multaQuebraContrato: input.multaQuebraContrato,
                multaQuebraPercentual,
                tipoMultaQuebra: input.tipoMultaQuebra,
                multaQuebraProporcional: input.multaQuebraProporcional ?? true,
                vencimentoQuebra: input.vencimentoQuebra ? normalizarDataUTC(input.vencimentoQuebra) : null,
                descontoPontualidade: input.descontoPontualidade,
                tipoDesconto: input.tipoDesconto,
                diasAntecedenciaDesc: input.diasAntecedenciaDesc,
                multaAtrasoPercentual: input.multaAtrasoPercentual,
                diasCarenciaMulta: input.diasCarenciaMulta,
                jurosAtrasoPercentual: input.jurosAtrasoPercentual,
                diasCarenciaJuros: input.diasCarenciaJuros,
                honorariosAdvPercentual: input.honorariosAdvPercentual,
                carenciaHonorariosDias: input.carenciaHonorariosDias,
                periodoGarantido: input.periodoGarantido,
                abrangenciaGarantia: input.abrangenciaGarantia,
            } });
            if (input.diaVencimento != null) {
                await tx.periodoContratoLocacao.updateMany({
                    where: { imovelLocacaoId: id, dataFim: { gte: normalizarDataUTC(formatarDataLocalISO()) } },
                    data: { diaVencimento: input.diaVencimento },
                });
            }
            if (input.parcelasIntermediacao) {
                await tx.parcelaIntermediacao.deleteMany({ where: { imovelLocacaoId: id } });
                if (input.parcelasIntermediacao.length > 0) {
                    await tx.parcelaIntermediacao.createMany({
                        data: input.parcelasIntermediacao.map((parcela, indice) => ({
                            imovelLocacaoId: id,
                            ordem: indice + 1,
                            dataVencimento: normalizarDataUTC(parcela.dataVencimento),
                            valor: parcela.valor,
                            observacao: parcela.observacao,
                        })),
                    });
                }
            }
            await sincronizarHistoricoLocacao(tx, id);
            return locacaoAtualizada;
        });
        revalidatePath("/locacao");
        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Erro ao atualizar dados de locação:", error);
        return { success: false, error: error.message || "Erro ao atualizar dados de locação." };
    }
};

export async function getAllLocatarios() {
    try {
        const list = await prisma.locatario.findMany({
            orderBy: {
                nome: "asc",
            },
        });
        return { success: true, data: list };
    } catch (error: any) {
        console.error("Erro ao buscar todos os locatários:", error);
        return { success: false, error: error.message || "Erro ao buscar locatários.", data: [] };
    }
}
