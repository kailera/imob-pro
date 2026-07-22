"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma"; // Ajuste o caminho conforme a localização do seu Prisma Client configurado
import { obterIndiceFallback, type ValorIndice } from "@/lib/locacao/indicesFallback";
import {
    adicionarDiasUTC,
    calcularPercentualEntreValores,
    datasSaoConsecutivas,
    HISTORICO_STATUS,
    inicioMesUTC,
    normalizarDataUTC,
    proximoMesUTC,
} from "@/lib/locacao/periodos";

const SERIES_REAJUSTE: Record<string, number> = {
    IPCA: 433, INPC: 188, IGPM: 189, IGP: 190, IPC: 193, "IPC-DI": 191,
};

type PrismaTransaction = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function sincronizarHistoricoLocacao(tx: PrismaTransaction, imovelLocacaoId: string) {
    const locacao = await tx.imovelLocacao.findUnique({
        where: { id: imovelLocacaoId },
        include: { periodos: { orderBy: { dataInicio: "asc" } } },
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
}

export const getAgendaVencimentosLocacao = async (ano: number, mes: number) => {
    if (!Number.isInteger(ano) || !Number.isInteger(mes) || mes < 1 || mes > 12) {
        return { success: false as const, error: "Mês de referência inválido.", data: [] as AgendaLocacaoEvento[] };
    }

    const inicio = inicioMesUTC(ano, mes);
    const fimExclusivo = proximoMesUTC(ano, mes);
    const inicioFimPeriodo = adicionarDiasUTC(inicio, -1);
    const fimFimPeriodo = adicionarDiasUTC(fimExclusivo, -1);

    try {
        const locacoes = await prisma.imovelLocacao.findMany({
            where: {
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
                periodos: { orderBy: { dataInicio: "asc" } },
            },
        });

        const agora = normalizarDataUTC(new Date());
        const eventos: AgendaLocacaoEvento[] = [];

        for (const locacao of locacoes) {
            const contrato = locacao.contratoImovelLocacaos[0];
            if (!contrato) continue;
            const dadosComuns = {
                contratoId: contrato.id,
                imovelLocacaoId: locacao.id,
                inquilino: contrato.locatarios[0]?.nome || "Não informado",
                imovel: locacao.imovel.descricao || locacao.imovel.codigo || "Não informado",
                valorAluguel: locacao.valorAluguel,
                indiceReajuste: locacao.indiceReajuste,
                historicoStatus: locacao.historicoPeriodosStatus,
            };

            const fimContrato = normalizarDataUTC(locacao.dataFim);
            if (fimContrato >= inicio && fimContrato < fimExclusivo) {
                eventos.push({
                    ...dadosComuns,
                    id: `contrato:${contrato.id}:${fimContrato.toISOString()}`,
                    tipo: "VENCIMENTO_CONTRATO",
                    dataEvento: fimContrato.toISOString(),
                    situacao: fimContrato < agora ? "ATRASADO" : "A_VENCER",
                    fonte: "CONTRATO",
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
                const precisaRevisar = locacao.historicoPeriodosStatus !== HISTORICO_STATUS.COMPLETO
                    || periodo.origemPeriodo === "SICADI_PROVISORIO";
                eventos.push({
                    ...dadosComuns,
                    id: `periodo:${periodo.id}:${dataReajuste.toISOString()}`,
                    tipo: "REAJUSTE_PERIODO",
                    dataEvento: dataReajuste.toISOString(),
                    periodoId: periodo.id,
                    valorAluguel: periodo.valorAluguel,
                    indiceReajuste: periodo.indiceReajuste || locacao.indiceReajuste,
                    situacao: tratado ? "TRATADO" : precisaRevisar ? "REVISAR_HISTORICO" : dataReajuste < agora ? "ATRASADO" : "A_VENCER",
                    fonte: precisaRevisar ? "SICADI" : "PERIODO_CONFIRMADO",
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

export const calcularIndiceReajuste = async (indice: string, dataInicio: string, dataFim: string) => {
    const serie = SERIES_REAJUSTE[indice];
    if (!serie) return { success: false, error: "Índice não disponível para cálculo automático." };
    const formatarData = (valor: string) => {
        const [ano, mes, dia] = valor.split("-");
        return `${dia}/${mes}/${ano}`;
    };
    try {
        const params = new URLSearchParams({ formato: "json", dataInicial: formatarData(dataInicio), dataFinal: formatarData(dataFim) });
        let dados: ValorIndice[] = [];
        let fonte: "BANCO_CENTRAL" | "CONTINGENCIA_BCB" = "BANCO_CENTRAL";
        try {
            const response = await fetch(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${serie}/dados?${params}`, {
                headers: { Accept: "application/json", "User-Agent": "ImobPro/1.0" },
                cache: "no-store",
                signal: AbortSignal.timeout(15000),
            });
            if (!response.ok) throw new Error(`BCB respondeu HTTP ${response.status}`);
            dados = (await response.json()) as ValorIndice[];
        } catch (error) {
            console.warn("Consulta ao BCB indisponível; usando contingência local:", error);
            dados = obterIndiceFallback(serie, dataInicio, dataFim);
            fonte = "CONTINGENCIA_BCB";
        }
        if (!dados.length) return { success: false, error: "Ainda não há valores publicados para esse período." };
        const fator = dados.reduce((total, item) => {
            const variacao = Number(item.valor.replace(",", "."));
            return Number.isFinite(variacao) ? total * (1 + variacao / 100) : total;
        }, 1);
        return { success: true, percentual: Number(((fator - 1) * 100).toFixed(4)), competenciaInicial: dados[0].data, competenciaFinal: dados[dados.length - 1].data, mesesConsiderados: dados.length, fonte };
    } catch (error: unknown) {
        console.error("Erro ao calcular índice de reajuste:", error);
        return { success: false, error: error instanceof Error ? error.message : "Não foi possível consultar o índice." };
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
        const contratos = await prisma.contratoImovelLocacao.findMany({
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
        });
        return { success: true, data: contratos };
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
}) => {
    try {
        const dataInicio = normalizarDataUTC(input.dataInicio);
        const dataFim = normalizarDataUTC(input.dataFim);
        if (dataInicio > dataFim) {
            return { success: false, error: "O início do contrato não pode ser posterior ao término." };
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
            } });
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

