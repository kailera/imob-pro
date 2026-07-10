"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Interface para entrada do Locatário (Inquilino)
export interface LocatarioInput {
  nome: string;
  cpfCnpj: string;
  telefone: string[]; // Formato: ["{ telefone: '...', qualificacao: '...', observacao: '...' }"]
  email: string;
  endereco: string[]; // Formato: ["{ cep: '...', logradouro: '...', ... }"]
  dataNasc: string;
  rg: string;
  orgaoEmissor: string;
  estadoCivil: string;
  profissao: string;
  nacionalidade: string;
  genero: string;
  documentoUrl?: string[];
}

// Interface para entrada do Fiador
export interface FiadorInput {
  nome: string;
  cpfCnpj: string;
  telefone: string[];
  email: string;
  endereco: string[];
  dataNasc: string;
  rg: string;
  orgaoEmissor: string;
  estadoCivil: string;
  profissao: string;
  nacionalidade: string;
  genero: string;
  documentoUrl?: string[];
}

// Auxiliar para obter/criar organização padrão
async function getOrCreateDefaultImobId() {
  const imob = await prisma.imob.findFirst();
  if (imob) return imob.id;
  const newImob = await prisma.imob.create({
    data: {
      orgId: "org_default",
    },
  });
  return newImob.id;
}

// 1. Obter inquilinos (Locatários)
export async function getInquilinos() {
  try {
    const list = await prisma.locatario.findMany({
      orderBy: { nome: "asc" },
    });
    return { success: true, data: list };
  } catch (error: any) {
    console.error("Erro ao carregar inquilinos:", error);
    return { success: false, error: error.message || "Erro ao carregar inquilinos." };
  }
}

// 2. Obter fiadores
export async function getFiadores() {
  try {
    const list = await prisma.fiador.findMany({
      orderBy: { nome: "asc" },
    });
    return { success: true, data: list };
  } catch (error: any) {
    console.error("Erro ao carregar fiadores:", error);
    return { success: false, error: error.message || "Erro ao carregar fiadores." };
  }
}

// 3. Criar Locatário (Inquilino) rápido
export async function createLocatario(input: LocatarioInput) {
  try {
    const locatario = await prisma.locatario.create({
      data: {
        nome: input.nome,
        cpfCnpj: input.cpfCnpj,
        telefone: input.telefone || [],
        email: input.email,
        endereco: input.endereco || [],
        dataNasc: input.dataNasc,
        rg: input.rg,
        orgaoEmissor: input.orgaoEmissor,
        estadoCivil: input.estadoCivil,
        profissao: input.profissao,
        nacionalidade: input.nacionalidade,
        genero: input.genero,
        documentoUrl: input.documentoUrl || [],
      },
    });

    revalidatePath("/locacao");
    return { success: true, data: locatario };
  } catch (error: any) {
    console.error("Erro ao criar inquilino:", error);
    return { success: false, error: error.message || "Erro ao criar inquilino." };
  }
}

// 4. Buscar imóveis por endereço/código e obter proprietário + vistoria mais recente
export async function searchImovelWithResolution(query: string) {
  try {
    if (!query || query.trim() === "") {
      return { success: true, data: [] };
    }

    // Busca imóveis ativos para locação cujo código ou bairro ou cidade contenham a query
    const imoveis = await prisma.imovel.findMany({
      where: {
        forLocacao: true,
        OR: [
          { codigo: { contains: query, mode: "insensitive" } },
          { bairro: { contains: query, mode: "insensitive" } },
          { cidade: { contains: query, mode: "insensitive" } },
        ],
      },
      include: {
        imovelLocacaos: {
          include: {
            locadors: true,
          },
          orderBy: { dataInicio: "desc" },
          take: 1,
        },
        vistorias: {
          orderBy: { data: "desc" },
          take: 1,
        },
      },
      take: 10,
    });

    return { success: true, data: imoveis };
  } catch (error: any) {
    console.error("Erro na busca de imóveis:", error);
    return { success: false, error: error.message || "Erro ao buscar imóveis." };
  }
}

// 5. Salvar Contrato de Locação (e suas entidades)
export async function createContratoLocacao(input: {
  imovelId: string;
  locatarioId: string;
  fiadorData?: FiadorInput | null;
  selectedFiadorId?: string | null;
  landlordData?: {
    nome: string;
    cpfCnpj: string;
    telefone: string[];
    email: string;
    endereco: string[];
    dataNasc: string;
    rg: string;
    orgaoEmissor: string;
    estadoCivil: string;
    profissao: string;
    nacionalidade: string;
    genero: string;
    documentoUrl?: string[];
  } | null;
  dataInicio: string;
  dataFim: string;
  valorAluguel: number;
  valorCondominio: number;
  valorIPTU: number;
}) {
  try {
    const imobId = await getOrCreateDefaultImobId();

    const contrato = await prisma.$transaction(async (tx) => {
      // 1. Criar ImovelLocacao (Detalhamento financeiro e de datas)
      const imovelLocacao = await tx.imovelLocacao.create({
        data: {
          imovelId: input.imovelId,
          dataInicio: new Date(input.dataInicio),
          dataFim: new Date(input.dataFim),
          valorAluguel: input.valorAluguel,
          hasCondominio: input.valorCondominio > 0,
          hasIPTU: input.valorIPTU > 0,
          valorTotal: input.valorAluguel + input.valorCondominio + input.valorIPTU,
        },
      });

      // 2. Vincular proprietário (Locador)
      if (input.landlordData) {
        await tx.locador.create({
          data: {
            nome: input.landlordData.nome,
            cpfCnpj: input.landlordData.cpfCnpj,
            telefone: input.landlordData.telefone || [],
            email: input.landlordData.email,
            endereco: input.landlordData.endereco || [],
            dataNasc: input.landlordData.dataNasc,
            rg: input.landlordData.rg,
            orgaoEmissor: input.landlordData.orgaoEmissor,
            estadoCivil: input.landlordData.estadoCivil,
            profissao: input.landlordData.profissao,
            nacionalidade: input.landlordData.nacionalidade,
            genero: input.landlordData.genero,
            documentoUrl: input.landlordData.documentoUrl || [],
            imovelLocacaoId: imovelLocacao.id,
          },
        });
      }

      // 3. Criar ContratoImovelLocacao
      const contratoCriado = await tx.contratoImovelLocacao.create({
        data: {
          imovelId: input.imovelId,
          imobId: imobId,
          imovelLocacaoId: imovelLocacao.id,
        },
      });

      // 4. Vincular inquilino (Locatario)
      await tx.locatario.update({
        where: { id: input.locatarioId },
        data: {
          contratoId: contratoCriado.id,
        },
      });

      // 5. Vincular ou Criar Fiador
      if (input.fiadorData) {
        // Criar um novo fiador associado a este contrato
        await tx.fiador.create({
          data: {
            nome: input.fiadorData.nome,
            cpfCnpj: input.fiadorData.cpfCnpj,
            telefone: input.fiadorData.telefone || [],
            email: input.fiadorData.email,
            endereco: input.fiadorData.endereco || [],
            dataNasc: input.fiadorData.dataNasc,
            rg: input.fiadorData.rg,
            orgaoEmissor: input.fiadorData.orgaoEmissor,
            estadoCivil: input.fiadorData.estadoCivil,
            profissao: input.fiadorData.profissao,
            nacionalidade: input.fiadorData.nacionalidade,
            genero: input.fiadorData.genero,
            documentoUrl: input.fiadorData.documentoUrl || [],
            contratoId: contratoCriado.id,
          },
        });
      } else if (input.selectedFiadorId) {
        // Se selecionou um fiador existente (clona as informações criando um novo registro vinculado ao contrato)
        const oldFiador = await tx.fiador.findUnique({
          where: { id: input.selectedFiadorId },
        });
        if (oldFiador) {
          await tx.fiador.create({
            data: {
              nome: oldFiador.nome,
              cpfCnpj: oldFiador.cpfCnpj,
              telefone: oldFiador.telefone?.toString(),
              email: oldFiador.email,
              endereco: oldFiador.endereco?.toString(),
              dataNasc: oldFiador.dataNasc,
              rg: oldFiador.rg,
              orgaoEmissor: oldFiador.orgaoEmissor,
              estadoCivil: oldFiador.estadoCivil,
              profissao: oldFiador.profissao,
              nacionalidade: oldFiador.nacionalidade,
              genero: oldFiador.genero,
              documentoUrl: oldFiador.documentoUrl?.toString(),
              contratoId: contratoCriado.id,
            },
          });
        }
      }

      return contratoCriado;
    });

    revalidatePath("/locacao");
    return { success: true, data: contrato };
  } catch (error: any) {
    console.error("Erro ao criar contrato de locação:", error);
    return { success: false, error: error.message || "Erro ao salvar contrato de locação." };
  }
}
