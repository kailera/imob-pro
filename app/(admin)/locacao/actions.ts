"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma"; // Ajuste o caminho conforme a localização do seu Prisma Client configurado

const SERIES_REAJUSTE: Record<string, number> = {
    IPCA: 433, INPC: 188, IGPM: 189, IGP: 190, IPC: 193, "IPC-DI": 191,
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
        const response = await fetch(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${serie}/dados?${params}`, {
            headers: { Accept: "application/json" },
            next: { revalidate: 3600 },
            signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) throw new Error("Serviço de índices indisponível.");
        const dados = (await response.json()) as Array<{ data: string; valor: string }>;
        if (!dados.length) return { success: false, error: "Ainda não há valores publicados para esse período." };
        const fator = dados.reduce((total, item) => {
            const variacao = Number(item.valor.replace(",", "."));
            return Number.isFinite(variacao) ? total * (1 + variacao / 100) : total;
        }, 1);
        return { success: true, percentual: Number(((fator - 1) * 100).toFixed(4)), competenciaInicial: dados[0].data, competenciaFinal: dados[dados.length - 1].data, mesesConsiderados: dados.length };
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
}) => {
    try {
        const dataInicioObj = new Date(input.dataInicio);
        const dataFimObj = new Date(input.dataFim);

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

        const novoPeriodo = await prisma.periodoContratoLocacao.create({
            data: {
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
                percentualReajuste: input.percentualReajuste,
                reajusteAutomatico: input.reajusteAutomatico ?? false,
                dataCalculoReajuste: input.percentualReajuste != null ? new Date() : null,
            },
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
}) => {
    try {
        const dataInicioObj = new Date(input.dataInicio);
        const dataFimObj = new Date(input.dataFim);

        // Obter o período atual
        const periodoAtual = await prisma.periodoContratoLocacao.findUnique({
            where: { id },
        });

        if (!periodoAtual) {
            return { success: false, error: "Período não encontrado." };
        }

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

        const periodoAtualizado = await prisma.periodoContratoLocacao.update({
            where: { id },
            data: {
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
                percentualReajuste: input.percentualReajuste,
                reajusteAutomatico: input.reajusteAutomatico ?? false,
                dataCalculoReajuste: input.percentualReajuste != null ? new Date() : null,
            },
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
        await prisma.periodoContratoLocacao.delete({
            where: { id },
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
        const updated = await prisma.imovelLocacao.update({
            where: { id },
            data: {
                dataInicio: new Date(input.dataInicio),
                dataFim: new Date(input.dataFim),
                hasCondominio: input.hasCondominio,
                hasIPTU: input.hasIPTU,
                taxaAdministracao: input.taxaAdministracao,
                taxaMultasEncargos: input.taxaMultasEncargos,
                taxaIntermediacao: input.taxaIntermediacao,
                irrfResponsabilidade: input.irrfResponsabilidade,
                carenciaRepasse: input.carenciaRepasse,
            },
        });
        revalidatePath("/locacao");
        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Erro ao atualizar dados de locação:", error);
        return { success: false, error: error.message || "Erro ao atualizar dados de locação." };
    }
};

