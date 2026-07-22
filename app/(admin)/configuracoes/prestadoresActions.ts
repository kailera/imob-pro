"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export type PrestadorServicoView = {
  id: string;
  nome: string;
  area: string;
  telefone: string | null;
  pix: string | null;
  ativo: boolean;
  manutencoesCount: number;
  createdAt: string;
};

export type PrestadorServicoInput = {
  nome: string;
  area: string;
  telefone?: string | null;
  pix?: string | null;
};

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

async function getActiveImobId() {
  const { userId, orgId } = await auth();
  if (!userId) throw new Error("Usuário não autenticado.");

  const imob = orgId
    ? await prisma.imob.findUnique({ where: { orgId }, select: { id: true } })
    : await prisma.imob.findFirst({
        where: { orgId: "org_default" },
        select: { id: true },
      });

  if (!imob) throw new Error("Imobiliária ativa não encontrada.");
  return imob.id;
}

async function assertCanManagePrestadores() {
  const { userId, orgRole, orgId } = await auth();
  if (!userId) throw new Error("Usuário não autenticado.");

  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  const authorized =
    orgRole === "org:admin" ||
    user?.role === "ADMIN" ||
    user?.role === "CORRETOR" ||
    !orgId;

  if (!authorized) {
    throw new Error("Apenas administradores e corretores podem gerenciar prestadores.");
  }
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

type ValidatedPrestadorInput =
  | { success: false; error: string }
  | {
      success: true;
      data: { nome: string; area: string; telefone: string | null; pix: string | null };
    };

function validateInput(input: PrestadorServicoInput): ValidatedPrestadorInput {
  const nome = input.nome.trim();
  const area = input.area.trim();
  const telefone = input.telefone?.trim() || null;
  const pix = input.pix?.trim() || null;

  if (nome.length < 2) return { success: false, error: "Informe o nome do prestador." };
  if (nome.length > 120) return { success: false, error: "O nome deve ter no máximo 120 caracteres." };
  if (area.length < 2) return { success: false, error: "Informe a área de atuação." };
  if (area.length > 100) return { success: false, error: "A área deve ter no máximo 100 caracteres." };
  if (telefone && telefone.length > 30) return { success: false, error: "O telefone deve ter no máximo 30 caracteres." };
  if (pix && pix.length > 180) return { success: false, error: "A chave Pix deve ter no máximo 180 caracteres." };

  return { success: true, data: { nome, area, telefone, pix } };
}

export async function getPrestadoresServico(): Promise<ActionResult<PrestadorServicoView[]>> {
  try {
    const imobId = await getActiveImobId();
    const prestadores = await prisma.prestadorServico.findMany({
      where: { imobId },
      include: { _count: { select: { manutencoes: true } } },
      orderBy: [{ ativo: "desc" }, { nome: "asc" }, { area: "asc" }],
    });

    return {
      success: true,
      data: prestadores.map((prestador) => ({
        id: prestador.id,
        nome: prestador.nome,
        area: prestador.area,
        telefone: prestador.telefone,
        pix: prestador.pix,
        ativo: prestador.ativo,
        manutencoesCount: prestador._count.manutencoes,
        createdAt: prestador.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    return { success: false, error: errorMessage(error, "Erro ao carregar prestadores.") };
  }
}

export async function createOrUpdatePrestadorServico(
  input: PrestadorServicoInput,
  id?: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    await assertCanManagePrestadores();
    const imobId = await getActiveImobId();
    const validated = validateInput(input);
    if (!validated.success) return { success: false, error: validated.error };

    if (id) {
      const current = await prisma.prestadorServico.findFirst({
        where: { id, imobId },
        select: { id: true },
      });
      if (!current) return { success: false, error: "Prestador não encontrado." };
    }

    const duplicate = await prisma.prestadorServico.findFirst({
      where: {
        imobId,
        id: id ? { not: id } : undefined,
        nome: { equals: validated.data.nome, mode: "insensitive" },
        area: { equals: validated.data.area, mode: "insensitive" },
      },
      select: { id: true },
    });
    if (duplicate) {
      return { success: false, error: "Já existe um prestador com este nome e área de atuação." };
    }

    const saved = id
      ? await prisma.prestadorServico.update({
          where: { id },
          data: validated.data,
          select: { id: true },
        })
      : await prisma.prestadorServico.create({
          data: { ...validated.data, imobId },
          select: { id: true },
        });

    revalidatePath("/configuracoes");
    revalidatePath("/manutencoes");
    return { success: true, data: saved };
  } catch (error) {
    return { success: false, error: errorMessage(error, "Erro ao salvar prestador.") };
  }
}

export async function setPrestadorServicoAtivo(
  id: string,
  ativo: boolean,
): Promise<ActionResult<{ ativo: boolean }>> {
  try {
    await assertCanManagePrestadores();
    const imobId = await getActiveImobId();
    const current = await prisma.prestadorServico.findFirst({
      where: { id, imobId },
      select: { id: true },
    });
    if (!current) return { success: false, error: "Prestador não encontrado." };

    await prisma.prestadorServico.update({
      where: { id },
      data: { ativo },
    });
    revalidatePath("/configuracoes");
    revalidatePath("/manutencoes");
    return { success: true, data: { ativo } };
  } catch (error) {
    return { success: false, error: errorMessage(error, "Erro ao alterar prestador.") };
  }
}
