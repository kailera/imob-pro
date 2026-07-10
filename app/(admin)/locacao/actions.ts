"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma"; // Ajuste o caminho conforme a localização do seu Prisma Client configurado
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
            imovel: {
                include: {
                    imovelLocacaos: {
                        include: {
                            locadors: true,
                        },
                    },
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
                                locadors: true
                            }
                        }
                    },
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
