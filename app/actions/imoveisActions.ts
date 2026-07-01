"use server";

import { prisma } from "@/lib/prisma";
import { TipoImovel } from "@/generated/prisma";
import { revalidatePath } from "next/cache";

export interface ImovelInput {
  codigo: string;
  numero: number;
  bairro: string;
  cidade: string;
  uf: string;
  cep: number;
  tipo: TipoImovel;
  forVenda: boolean;
  forLocacao: boolean;
  valorAluguel?: number | null;
  valorCondominio?: number | null;
  valorIPTU?: number | null;
  valorVenda?: number | null;
  valorTotal?: number | null;
}

// Auxiliar para obter/criar organização padrão
async function getOrCreateDefaultImobId() {
  const imob = await prisma.imob.findFirst();
  if (imob) return imob.id;
  const newImob = await prisma.imob.create({
    data: {
      orgId: "org_default"
    }
  });
  return newImob.id;
}

export async function getImoveis() {
  try {
    const imoveis = await prisma.imovel.findMany({
      orderBy: {
        codigo: "asc",
      },
    });
    return { success: true, data: imoveis };
  } catch (error: any) {
    console.error("Erro ao carregar imóveis:", error);
    return { success: false, error: error.message || "Erro ao carregar imóveis." };
  }
}

export async function createImovel(input: ImovelInput) {
  try {
    // 1. Validações Básicas
    if (!input.codigo || !input.bairro || !input.cidade || !input.uf || !input.cep || !input.tipo) {
      return { success: false, error: "Preencha todos os campos obrigatórios." };
    }

    // 2. Validação Lote (Sem Locação)
    if (input.tipo === TipoImovel.LOTE && input.forLocacao) {
      return { success: false, error: "Loteamentos (Lotes) não podem ser alugados, apenas vendidos." };
    }

    // 3. Validação de Modalidades Selecionadas
    if (!input.forVenda && !input.forLocacao) {
      return { success: false, error: "Selecione ao menos uma modalidade (Venda ou Locação)." };
    }

    // 4. Verificar código duplicado
    const existing = await prisma.imovel.findUnique({
      where: { codigo: input.codigo },
    });
    if (existing) {
      return { success: false, error: `Já existe um imóvel cadastrado com o código ${input.codigo}.` };
    }

    const imobId = await getOrCreateDefaultImobId();

    const imovel = await prisma.imovel.create({
      data: {
        codigo: input.codigo,
        numero: Number(input.numero),
        bairro: input.bairro,
        cidade: input.cidade,
        uf: input.uf.toUpperCase(),
        cep: Number(input.cep),
        tipo: input.tipo,
        forVenda: input.forVenda,
        forLocacao: input.forLocacao,
        valorVenda: input.forVenda ? Number(input.valorVenda || 0) : null,
        valorAluguel: input.forLocacao ? Number(input.valorAluguel || 0) : null,
        valorCondominio: input.forLocacao ? Number(input.valorCondominio || 0) : null,
        valorIPTU: input.forLocacao ? Number(input.valorIPTU || 0) : null,
        valorTotal: input.forLocacao 
          ? (Number(input.valorAluguel || 0) + Number(input.valorCondominio || 0) + Number(input.valorIPTU || 0))
          : null,
        imobId,
      },
    });

    revalidatePath("/imoveis");
    return { success: true, data: imovel };
  } catch (error: any) {
    console.error("Erro ao criar imóvel:", error);
    return { success: false, error: error.message || "Erro desconhecido ao criar imóvel." };
  }
}

export async function updateImovel(id: string, input: ImovelInput) {
  try {
    // 1. Validações Básicas
    if (!input.codigo || !input.bairro || !input.cidade || !input.uf || !input.cep || !input.tipo) {
      return { success: false, error: "Preencha todos os campos obrigatórios." };
    }

    // 2. Validação Lote (Sem Locação)
    if (input.tipo === TipoImovel.LOTE && input.forLocacao) {
      return { success: false, error: "Loteamentos (Lotes) não podem ser alugados, apenas vendidos." };
    }

    // 3. Validação de Modalidades Selecionadas
    if (!input.forVenda && !input.forLocacao) {
      return { success: false, error: "Selecione ao menos uma modalidade (Venda ou Locação)." };
    }

    // 4. Verificar código duplicado (em outro imóvel)
    const existing = await prisma.imovel.findUnique({
      where: { codigo: input.codigo },
    });
    if (existing && existing.id !== id) {
      return { success: false, error: `Já existe outro imóvel cadastrado com o código ${input.codigo}.` };
    }

    const imovel = await prisma.imovel.update({
      where: { id },
      data: {
        codigo: input.codigo,
        numero: Number(input.numero),
        bairro: input.bairro,
        cidade: input.cidade,
        uf: input.uf.toUpperCase(),
        cep: Number(input.cep),
        tipo: input.tipo,
        forVenda: input.forVenda,
        forLocacao: input.forLocacao,
        valorVenda: input.forVenda ? Number(input.valorVenda || 0) : null,
        valorAluguel: input.forLocacao ? Number(input.valorAluguel || 0) : null,
        valorCondominio: input.forLocacao ? Number(input.valorCondominio || 0) : null,
        valorIPTU: input.forLocacao ? Number(input.valorIPTU || 0) : null,
        valorTotal: input.forLocacao 
          ? (Number(input.valorAluguel || 0) + Number(input.valorCondominio || 0) + Number(input.valorIPTU || 0))
          : null,
      },
    });

    revalidatePath("/imoveis");
    return { success: true, data: imovel };
  } catch (error: any) {
    console.error("Erro ao atualizar imóvel:", error);
    return { success: false, error: error.message || "Erro desconhecido ao atualizar imóvel." };
  }
}

export async function deleteImovel(id: string) {
  try {
    await prisma.imovel.delete({
      where: { id },
    });
    revalidatePath("/imoveis");
    return { success: true };
  } catch (error: any) {
    console.error("Erro ao excluir imóvel:", error);
    return { success: false, error: error.message || "Erro ao excluir imóvel." };
  }
}
