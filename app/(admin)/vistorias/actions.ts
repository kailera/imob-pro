"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
    TipoVistoria,
    VistoriaStatus,
    LimpezaStatus,
    TipoImovelVistoriado
} from "@/generated/prisma";

// Auxiliar para gerar código sequencial de vistoria (ex: VIS-2026-001)
async function generateVistoriaCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await prisma.vistoria.count({
        where: {
            data: {
                gte: new Date(`${year}-01-01`),
                lt: new Date(`${year + 1}-01-01`),
            },
        },
    });
    const sequential = String(count + 1).padStart(3, "0");
    return `VIS-${year}-${sequential}`;
}

export async function getVistorias() {
    try {
        const list = await prisma.vistoria.findMany({
            include: {
                imovel: true,
                vistoriador: true,
                operador: true,
            },
            orderBy: {
                data: "desc",
            },
        });
        return { success: true, data: list };
    } catch (error: any) {
        console.error("Erro ao buscar vistorias:", error);
        return { success: false, error: error.message || "Erro ao buscar vistorias." };
    }
}

export async function getVistoriaById(id: string) {
    try {
        const vistoria = await prisma.vistoria.findUnique({
            where: { id },
            include: {
                imovel: true,
                vistoriador: true,
                operador: true,
                ambienteVistorias: {
                    orderBy: { ordem: "asc" },
                },
                comentariosVistoria: {
                    orderBy: { createdAt: "desc" },
                },
            },
        });
        return { success: true, data: vistoria };
    } catch (error: any) {
        console.error(`Erro ao buscar vistoria ${id}:`, error);
        return { success: false, error: error.message || "Erro ao buscar vistoria." };
    }
}

export async function createVistoria(input: {
    imovelId: string;
    operadorId: string;
    vistoriadorId: string;
    tipo: TipoVistoria;
    data: string | Date;
    tipoImovelVistoriado: TipoImovelVistoriado;
    proprietario?: string;
    ambientesPadrao?: string[];
}) {
    try {
        const codigo = await generateVistoriaCode();

        const novaVistoria = await prisma.$transaction(async (tx: any) => {
            const vistoria = await tx.vistoria.create({
                data: {
                    codigo,
                    data: new Date(input.data),
                    tipo: input.tipo,
                    status: VistoriaStatus.NAO_INICIADA,
                    observacoes: "",
                    imovelId: input.imovelId,
                    operadorId: input.operadorId,
                    vistoriadorId: input.vistoriadorId,
                    tipoImovelVistoriado: input.tipoImovelVistoriado,
                    proprietario: input.proprietario || null,
                },
            });

            // Buscar se há uma vistoria anterior deste imóvel para copiar os cômodos
            const ultimaVistoria = await tx.vistoria.findFirst({
                where: { imovelId: input.imovelId },
                orderBy: { data: "desc" },
                include: {
                    ambienteVistorias: true,
                },
            });

            let ambientesParaCriar: { nome: string; tipo: string; ordem: number }[] = [];

            if (ultimaVistoria && ultimaVistoria.ambienteVistorias.length > 0) {
                ambientesParaCriar = ultimaVistoria.ambienteVistorias.map((amb: any, index: number) => ({
                    nome: amb.nome,
                    tipo: amb.tipo,
                    ordem: index,
                }));
            } else if (input.ambientesPadrao && input.ambientesPadrao.length > 0) {
                ambientesParaCriar = input.ambientesPadrao.map((nome, index) => ({
                    nome,
                    tipo: nome,
                    ordem: index,
                }));
            }

            for (const amb of ambientesParaCriar) {
                await tx.ambienteVistoria.create({
                    data: {
                        nome: amb.nome,
                        tipo: amb.tipo,
                        ordem: amb.ordem,
                        vistoriaId: vistoria.id,
                        visaoGeral: "",
                        comentarios: "",
                    },
                });
            }

            return vistoria;
        });

        revalidatePath("/vistorias");
        return { success: true, data: novaVistoria };
    } catch (error: any) {
        console.error("Erro ao criar vistoria:", error);
        return { success: false, error: error.message || "Erro ao criar vistoria." };
    }
}

export async function updateVistoria(
    id: string,
    input: {
        status?: VistoriaStatus;
        observacoes?: string;
        reparosNecessarios?: string;
        limpezaStatus?: LimpezaStatus;
        limpezaObservacao?: string;
        chavesQuantidade?: number;
        chavesObservacao?: string;
        medidorAguaNumero?: string;
        medidorAguaLeitura?: string;
        medidorAguaFotoUrl?: string;
        medidorLuzNumero?: string;
        medidorLuzLeitura?: string;
        medidorLuzFotoUrl?: string;
        infoGeral?: any;
        rooms?: any[];
    }
) {
    try {
        const vistoria = await prisma.$transaction(async (tx: any) => {
            // 1. Atualizar campos principais da vistoria
            const updatedVistoria = await tx.vistoria.update({
                where: { id },
                data: {
                    status: input.status,
                    observacoes: input.observacoes,
                    reparosNecessarios: input.reparosNecessarios,
                    limpezaStatus: input.limpezaStatus,
                    limpezaObservacao: input.limpezaObservacao,
                    chavesQuantidade: input.chavesQuantidade,
                    chavesObservacao: input.chavesObservacao,
                    medidorAguaNumero: input.medidorAguaNumero,
                    medidorAguaLeitura: input.medidorAguaLeitura,
                    medidorAguaFotoUrl: input.medidorAguaFotoUrl,
                    medidorLuzNumero: input.medidorLuzNumero,
                    medidorLuzLeitura: input.medidorLuzLeitura,
                    medidorLuzFotoUrl: input.medidorLuzFotoUrl,
                    infoGeral: input.infoGeral ? input.infoGeral : undefined,
                },
            });

            // 2. Realizar Upsert dos Ambientes se fornecidos
            if (input.rooms) {
                const existingRooms = await tx.ambienteVistoria.findMany({
                    where: { vistoriaId: id },
                });
                const existingIds = existingRooms.map((r: any) => r.id);
                const updatedIds = input.rooms.map((r: any) => r.id);

                // Excluir cômodos removidos na UI
                const deleteIds = existingIds.filter((id: string) => !updatedIds.includes(id));
                if (deleteIds.length > 0) {
                    await tx.ambienteVistoria.deleteMany({
                        where: { id: { in: deleteIds } },
                    });
                }

                // Criar ou atualizar cômodos restantes
                for (let idx = 0; idx < input.rooms.length; idx++) {
                    const r = input.rooms[idx];
                    // Se for um id gerado provisoriamente e não for um UUID, podemos deixar o Prisma gerar ou usar o id fornecido se for uuid
                    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(r.id);

                    await tx.ambienteVistoria.upsert({
                        where: { id: isUuid ? r.id : "inexistent-placeholder-id" }, // força criação se não for UUID
                        update: {
                            nome: r.name,
                            tipo: r.type,
                            ordem: idx,
                            visaoGeral: r.visaoGeral || "",
                            comentarios: r.comentarios || "",
                        },
                        create: {
                            nome: r.name,
                            tipo: r.type,
                            ordem: idx,
                            vistoriaId: id,
                            visaoGeral: r.visaoGeral || "",
                            comentarios: r.comentarios || "",
                        },
                    });
                }
            }

            return updatedVistoria;
        });

        revalidatePath("/vistorias");
        revalidatePath(`/vistorias/ficha-vistoria/${id}`);
        return { success: true, data: vistoria };
    } catch (error: any) {
        console.error(`Erro ao atualizar vistoria ${id}:`, error);
        return { success: false, error: error.message || "Erro ao atualizar vistoria." };
    }
}

export async function addVistoriaComment(
    vistoriaId: string,
    input: {
        roomId: string;
        roomName: string;
        text: string;
        status: string;
        media?: any[];
    }
) {
    try {
        const novoComentario = await prisma.comentarioVistoria.create({
            data: {
                vistoriaId,
                roomId: input.roomId,
                roomName: input.roomName,
                texto: input.text,
                status: input.status,
                midias: input.media ? (input.media as any) : undefined,
            },
        });
        revalidatePath(`/vistorias/ficha-vistoria/${vistoriaId}`);
        return { success: true, data: novoComentario };
    } catch (error: any) {
        console.error("Erro ao adicionar comentário:", error);
        return { success: false, error: error.message || "Erro ao adicionar comentário." };
    }
}

export async function getVistoriadores() {
    try {
        const users = await prisma.users.findMany({
            where: {
                role: "VISTORIADOR",
            },
        });
        return { success: true, data: users };
    } catch (error: any) {
        console.error("Erro ao buscar vistoriadores:", error);
        return { success: false, error: error.message || "Erro ao buscar vistoriadores." };
    }
}

export async function getImoveisForVistoria() {
    try {
        const imoveis = await prisma.imovel.findMany({
            include: {
                imovelLocacaos: {
                    include: {
                        locadors: true,
                    },
                },
            },
            orderBy: {
                codigo: "asc",
            },
        });
        return { success: true, data: imoveis };
    } catch (error: any) {
        console.error("Erro ao buscar imóveis para vistoria:", error);
        return { success: false, error: error.message || "Erro ao buscar imóveis." };
    }
}

export async function getVistoriaForContrato(imovelId: string) {
    const vistoria = await prisma.vistoria.findFirst({
        where: {
            imovelId,
        },
    })
    return vistoria
}