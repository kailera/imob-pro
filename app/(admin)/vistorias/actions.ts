"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import {
    TipoVistoria,
    VistoriaStatus,
    LimpezaStatus,
    TipoImovelVistoriado,
    UsersRole
} from "@/generated/prisma";
import { auth } from "@clerk/nextjs/server";

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

async function getOrCreateDbUser(userId: string, sessionClaims: any) {
    let dbUser = await prisma.users.findUnique({
        where: { id: userId }
    });

    if (!dbUser) {
        let imob = await prisma.imob.findFirst();
        if (!imob) {
            imob = await prisma.imob.create({
                data: {
                    orgId: "org_default",
                },
            });
        }

        const email = (sessionClaims as any)?.email || "operador@imobpro.com.br";
        const firstName = (sessionClaims as any)?.firstName || "Membro";
        const lastName = (sessionClaims as any)?.lastName || "Equipe";

        const orgRole = (sessionClaims as any)?.orgRole;
        let dbRole: UsersRole = UsersRole.ADMIN;
        if (orgRole === "org:corretor" || orgRole === "corretor") {
            dbRole = UsersRole.CORRETOR;
        } else if (orgRole === "org:operador" || orgRole === "operador") {
            dbRole = UsersRole.OPERADOR;
        }

        dbUser = await prisma.users.create({
            data: {
                id: userId,
                email: email,
                firstName: firstName,
                lastName: lastName,
                role: dbRole,
                imobId: imob.id,
                ativo: true,
            },
        });
    }
    return dbUser;
}

export async function getCurrentUser() {
    try {
        const { userId, sessionClaims } = await auth();
        if (!userId) return { success: false, error: "Não autenticado." };
        const user = await getOrCreateDbUser(userId, sessionClaims);
        return { success: true, data: user };
    } catch (error: any) {
        console.error("Erro ao carregar usuário atual:", error);
        return { success: false, error: error.message || "Erro ao buscar usuário atual." };
    }
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
                imovel: {
                    include: {
                        imob: true,
                        contratoImovelLocacaos: {
                            include: { locatarios: true },
                        },
                    },
                },
                vistoriador: true,
                operador: {
                    include: { imob: true },
                },
                locatario: true,
                ambienteVistorias: {
                    orderBy: { ordem: "asc" },
                },
                comentariosVistoria: {
                    orderBy: { createdAt: "desc" },
                },
                contestacaoVistorias: {
                    orderBy: { createdAt: "desc" },
                },
                locatariosAutorizados: {
                    include: { locatario: true },
                    orderBy: { createdAt: "asc" },
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
        const { userId, sessionClaims } = await auth();
        const finalOperadorId = userId || input.operadorId;

        // Garantir que o operador esteja cadastrado no banco de dados local para evitar violação de FK
        if (finalOperadorId) {
            const userExists = await prisma.users.findUnique({
                where: { id: finalOperadorId },
            });

            if (!userExists) {
                // Caso não exista, cria-o no banco local de forma dinâmica/JIT
                // Buscar organização padrão ou associada
                let imob = await prisma.imob.findFirst();
                if (!imob) {
                    imob = await prisma.imob.create({
                        data: {
                            orgId: "org_default",
                        },
                    });
                }

                // Extrair metadados úteis do token se disponíveis
                const email = (sessionClaims as any)?.email || "operador@imobpro.com.br";
                const firstName = (sessionClaims as any)?.firstName || "Membro";
                const lastName = (sessionClaims as any)?.lastName || "Equipe";

                await prisma.users.create({
                    data: {
                        id: finalOperadorId,
                        email: email,
                        firstName: firstName,
                        lastName: lastName,
                        role: "ADMIN", // Papel padrão inicial
                        imobId: imob.id,
                        ativo: true,
                    },
                });
            }
        }

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
                    operadorId: finalOperadorId,
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
        const { userId, sessionClaims } = await auth();
        if (!userId) {
            return { success: false, error: "Não autorizado." };
        }
        const dbUser = await getOrCreateDbUser(userId, sessionClaims);

        const currentVistoria = await prisma.vistoria.findUnique({
            where: { id }
        });
        if (!currentVistoria) {
            return { success: false, error: "Vistoria não encontrada." };
        }

        const isBrokerOrAdmin = dbUser.role === "ADMIN" || dbUser.role === "CORRETOR";

        if (input.status === VistoriaStatus.CONCLUIDA && !isBrokerOrAdmin) {
            return { success: false, error: "Apenas corretores ou administradores podem aprovar vistorias." };
        }

        if (currentVistoria.status === VistoriaStatus.AGUARDANDO_APROVACAO && input.status && input.status !== VistoriaStatus.AGUARDANDO_APROVACAO && input.status !== VistoriaStatus.CONCLUIDA && !isBrokerOrAdmin) {
            return { success: false, error: "Apenas corretores ou administradores podem reprovar ou alterar o status de vistorias pendentes de aprovação." };
        }


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
                ativo: true,
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

export async function generateTokenAcesso(vistoriaId: string) {
    try {
        const vistoria = await prisma.vistoria.findUnique({
            where: { id: vistoriaId },
            select: { tokenAcesso: true }
        });

        if (vistoria?.tokenAcesso) {
            return { success: true, tokenAcesso: vistoria.tokenAcesso };
        }

        const token = crypto.randomUUID();
        await prisma.vistoria.update({
            where: { id: vistoriaId },
            data: { tokenAcesso: token }
        });

        revalidatePath("/vistorias");
        revalidatePath(`/vistorias/ficha-vistoria/${vistoriaId}`);
        return { success: true, tokenAcesso: token };
    } catch (error: any) {
        console.error("Erro ao gerar token de acesso:", error);
        return { success: false, error: error.message || "Erro ao gerar token." };
    }
}

export async function getLocatarios() {
    try {
        const list = await prisma.locatario.findMany({
            orderBy: {
                nome: "asc",
            },
        });
        return { success: true, data: list };
    } catch (error: any) {
        console.error("Erro ao buscar inquilinos:", error);
        return { success: false, error: error.message || "Erro ao buscar inquilinos." };
    }
}

export async function associateTenantToVistoria(vistoriaId: string, locatarioId: string) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return { success: false, error: "Não autorizado." };
        }
        await prisma.$transaction(async (tx) => {
            const vistoria = await tx.vistoria.findUnique({
                where: { id: vistoriaId },
                select: { locatarioId: true },
            });
            if (!vistoria) throw new Error("Vistoria não encontrada.");

            await tx.vistoriaLocatario.upsert({
                where: { vistoriaId_locatarioId: { vistoriaId, locatarioId } },
                create: { vistoriaId, locatarioId },
                update: {},
            });

            if (!vistoria.locatarioId) {
                await tx.vistoria.update({
                    where: { id: vistoriaId },
                    data: { locatarioId },
                });
            }
        });
        revalidatePath("/vistorias");
        revalidatePath(`/vistorias/ficha-vistoria/${vistoriaId}`);
        return { success: true };
    } catch (error: any) {
        console.error("Erro ao associar inquilino:", error);
        return { success: false, error: error.message || "Erro ao associar inquilino." };
    }
}

export async function validateTenantAccess(tokenAcesso: string, cpfCnpj: string) {
    try {
        const vistoria = await prisma.vistoria.findUnique({
            where: { tokenAcesso },
            include: {
                locatario: true,
                locatariosAutorizados: {
                    include: { locatario: true }
                },
                imovel: {
                    include: {
                        contratoImovelLocacaos: {
                            include: {
                                locatarios: true
                            }
                        },
                        imovelLocacaos: {
                            include: {
                                locadors: true
                            }
                        }
                    }
                }
            }
        });

        if (!vistoria) {
            return { success: false, error: "Vistoria não encontrada." };
        }

        const cleanInput = cpfCnpj.replace(/\D/g, "");

        // 1. Procurar por locatário vinculado diretamente
        let matchesLocatario = false;
        if (vistoria.locatario && vistoria.locatario.cpfCnpj.replace(/\D/g, "") === cleanInput) {
            matchesLocatario = true;
        }

        if (!matchesLocatario) {
            matchesLocatario = vistoria.locatariosAutorizados.some(({ locatario }) =>
                locatario.cpfCnpj.replace(/\D/g, "") === cleanInput
            );
        }

        // 2. Fallback: Procurar por locatário nos contratos
        if (!matchesLocatario) {
            const contratos = vistoria.imovel.contratoImovelLocacaos;
            matchesLocatario = contratos.some(contrato =>
                contrato.locatarios.some(locatario =>
                    locatario.cpfCnpj.replace(/\D/g, "") === cleanInput
                )
            );
        }

        // Procurar por proprietário (locador) com esse CPF/CNPJ
        const locacoes = vistoria.imovel.imovelLocacaos;
        const matchesLocador = locacoes.some(locacao =>
            locacao.locadors.some(locador =>
                locador.cpfCnpj.replace(/\D/g, "") === cleanInput
            )
        );

        if (!matchesLocatario && !matchesLocador) {
            return { success: false, error: "Acesso não autorizado. Verifique os dados informados." };
        }

        return { success: true, vistoriaId: vistoria.id };
    } catch (error: any) {
        console.error("Erro ao validar acesso da vistoria:", error);
        return { success: false, error: error.message || "Erro ao validar acesso." };
    }
}

export async function getVistoriaByToken(tokenAcesso: string) {
    try {
        const vistoria = await prisma.vistoria.findUnique({
            where: { tokenAcesso },
            include: {
                imovel: true,
                ambienteVistorias: {
                    orderBy: { ordem: "asc" },
                },
                contestacaoVistorias: {
                    orderBy: { createdAt: "desc" }
                }
            }
        });

        if (!vistoria) {
            return { success: false, error: "Vistoria não encontrada." };
        }

        return { success: true, data: vistoria };
    } catch (error: any) {
        console.error("Erro ao carregar vistoria pelo token:", error);
        return { success: false, error: error.message || "Erro ao buscar vistoria." };
    }
}

export async function submitContestacao(input: {
    tokenAcesso: string;
    ambienteId?: string;
    ambienteNome?: string;
    descricao: string;
    midias?: any[];
}) {
    try {
        const vistoria = await prisma.vistoria.findUnique({
            where: { tokenAcesso: input.tokenAcesso }
        });

        if (!vistoria) {
            return { success: false, error: "Vistoria não encontrada." };
        }

        const novaContestacao = await prisma.contestacaoVistoria.create({
            data: {
                vistoriaId: vistoria.id,
                ambienteId: input.ambienteId || null,
                ambienteNome: input.ambienteNome || null,
                descricao: input.descricao,
                midias: input.midias ? (input.midias as any) : undefined,
                resolvido: false
            }
        });

        // Atualiza status da vistoria para CONTESTADA
        await prisma.vistoria.update({
            where: { id: vistoria.id },
            data: { status: "CONTESTADA" }
        });

        revalidatePath("/vistorias");
        revalidatePath(`/vistorias/ficha-vistoria/${vistoria.id}`);
        return { success: true, data: novaContestacao };
    } catch (error: any) {
        console.error("Erro ao enviar contestação:", error);
        return { success: false, error: error.message || "Erro ao enviar contestação." };
    }
}

export async function resolveContestacao(
    contestacaoId: string,
    input: {
        respostaAdmin?: string;
        profissionalNome?: string;
        profissionalContato?: string;
        comprovanteUrl?: string;
    }
) {
    try {
        const { userId, sessionClaims } = await auth();
        if (!userId) {
            return { success: false, error: "Não autorizado." };
        }
        const dbUser = await getOrCreateDbUser(userId, sessionClaims);
        if (dbUser.role !== "ADMIN" && dbUser.role !== "CORRETOR") {
            return { success: false, error: "Apenas corretores/administradores podem resolver contestações." };
        }

        const contestacao = await prisma.contestacaoVistoria.update({
            where: { id: contestacaoId },
            data: {
                resolvido: true,
                resolvidoEm: new Date(),
                respostaAdmin: input.respostaAdmin,
                profissionalNome: input.profissionalNome,
                profissionalContato: input.profissionalContato,
                comprovanteUrl: input.comprovanteUrl
            }
        });

        // Verifica se todas as contestações daquela vistoria foram resolvidas
        const pendentes = await prisma.contestacaoVistoria.count({
            where: {
                vistoriaId: contestacao.vistoriaId,
                resolvido: false
            }
        });

        // Se resolveu tudo, podemos voltar o status da vistoria para CONCLUIDA (ou aguardando aprovação se fizer sentido, mas CONCLUIDA/AGUARDANDO_APROVACAO)
        if (pendentes === 0) {
            await prisma.vistoria.update({
                where: { id: contestacao.vistoriaId },
                data: { status: "CONCLUIDA" }
            });
        }

        revalidatePath("/vistorias");
        revalidatePath(`/vistorias/ficha-vistoria/${contestacao.vistoriaId}`);
        return { success: true, data: contestacao };
    } catch (error: any) {
        console.error("Erro ao resolver contestação:", error);
        return { success: false, error: error.message || "Erro ao resolver contestação." };
    }
}

export async function updateVistoriaComment(
    commentId: string,
    input: {
        text: string;
        status: string;
        media?: any[];
    }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return { success: false, error: "Não autorizado." };
        }
        const comment = await prisma.comentarioVistoria.findUnique({
            where: { id: commentId }
        });
        if (!comment) {
            return { success: false, error: "Comentário não encontrado." };
        }

        const updated = await prisma.comentarioVistoria.update({
            where: { id: commentId },
            data: {
                texto: input.text,
                status: input.status,
                midias: input.media ? (input.media as any) : undefined,
            }
        });

        revalidatePath(`/vistorias/ficha-vistoria/${comment.vistoriaId}`);
        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Erro ao atualizar comentário:", error);
        return { success: false, error: error.message || "Erro ao atualizar comentário." };
    }
}

export async function deleteVistoriaComment(commentId: string) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return { success: false, error: "Não autorizado." };
        }
        const comment = await prisma.comentarioVistoria.findUnique({
            where: { id: commentId }
        });
        if (!comment) {
            return { success: false, error: "Comentário não encontrado." };
        }

        await prisma.comentarioVistoria.delete({
            where: { id: commentId }
        });

        revalidatePath(`/vistorias/ficha-vistoria/${comment.vistoriaId}`);
        return { success: true };
    } catch (error: any) {
        console.error("Erro ao excluir comentário:", error);
        return { success: false, error: error.message || "Erro ao excluir comentário." };
    }
}

export async function createInquilino(input: {
    nome: string;
    cpfCnpj: string;
    email: string;
    telefone: string;
}) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return { success: false, error: "Não autorizado." };
        }

        const telefoneJson = [{ tipo: "Celular", numero: input.telefone }];

        const newLocatario = await prisma.locatario.create({
            data: {
                nome: input.nome,
                cpfCnpj: input.cpfCnpj,
                email: input.email,
                telefone: telefoneJson,
                endereco: {},
                dataNasc: "Não informada",
                rg: "Não informado",
                orgaoEmissor: "Não informado",
                estadoCivil: "Não informado",
                profissao: "Não informada",
                nacionalidade: "Não informada",
                genero: "Não informado",
            }
        });

        return { success: true, data: newLocatario };
    } catch (error: any) {
        console.error("Erro ao criar inquilino rápido:", error);
        return { success: false, error: error.message || "Erro ao criar inquilino." };
    }
}
