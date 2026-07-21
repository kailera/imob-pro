"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Interface para entrada do Locatário (Inquilino)
export interface LocatarioInput {
  nome: string;
  cpfCnpj: string;
  telefone: any; // Múltiplos telefones no formato JSON [{tipo: string, numero: string, observacao?: string}]
  email: string;
  endereco: any; // Formato JSON ou array de strings com cep, logradouro, etc.
  dataNasc: string;
  rg: string;
  orgaoEmissor: string;
  estadoCivil: string;
  profissao: string;
  nacionalidade: string;
  genero: string;
  rendaMensal?: number;
  rne?: string;

  // Dados do Cônjuge
  conjugeNome?: string;
  conjugeCpf?: string;
  conjugeRg?: string;
  conjugeOrgaoEmissor?: string;
  conjugeEmail?: string;
  conjugeDataNasc?: string;
  conjugeProfissao?: string;
  conjugeRendaMensal?: number;
  conjugeNacionalidade?: string;
  conjugeRne?: string;
  conjugeTelefone?: any;

  documentoUrl?: any; // Objeto/JSON com caminhos de documentos
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
        endereco: input.endereco || {},
        dataNasc: input.dataNasc,
        rg: input.rg,
        orgaoEmissor: input.orgaoEmissor,
        estadoCivil: input.estadoCivil,
        profissao: input.profissao,
        nacionalidade: input.nacionalidade,
        genero: input.genero,
        rendaMensal: input.rendaMensal,
        rne: input.rne,

        // Cônjuge
        conjugeNome: input.conjugeNome || null,
        conjugeCpf: input.conjugeCpf || null,
        conjugeRg: input.conjugeRg || null,
        conjugeOrgaoEmissor: input.conjugeOrgaoEmissor || null,
        conjugeEmail: input.conjugeEmail || null,
        conjugeDataNasc: input.conjugeDataNasc || null,
        conjugeProfissao: input.conjugeProfissao || null,
        conjugeRendaMensal: input.conjugeRendaMensal || null,
        conjugeNacionalidade: input.conjugeNacionalidade || null,
        conjugeRne: input.conjugeRne || null,
        conjugeTelefone: input.conjugeTelefone || null,

        documentoUrl: input.documentoUrl || {},
      },
    });

    revalidatePath("/locacao");
    return { success: true, data: locatario };
  } catch (error: any) {
    console.error("Erro ao criar inquilino:", error);
    return { success: false, error: error.message || "Erro ao criar inquilino." };
  }
}

// 3.1 Atualizar Locatário (Inquilino)
export async function updateLocatario(id: string, input: LocatarioInput) {
  try {
    const locatario = await prisma.locatario.update({
      where: { id },
      data: {
        nome: input.nome,
        cpfCnpj: input.cpfCnpj,
        telefone: input.telefone || [],
        email: input.email,
        endereco: input.endereco || {},
        dataNasc: input.dataNasc,
        rg: input.rg,
        orgaoEmissor: input.orgaoEmissor,
        estadoCivil: input.estadoCivil,
        profissao: input.profissao,
        nacionalidade: input.nacionalidade,
        genero: input.genero,
        rendaMensal: input.rendaMensal,
        rne: input.rne,

        // Cônjuge
        conjugeNome: input.conjugeNome || null,
        conjugeCpf: input.conjugeCpf || null,
        conjugeRg: input.conjugeRg || null,
        conjugeOrgaoEmissor: input.conjugeOrgaoEmissor || null,
        conjugeEmail: input.conjugeEmail || null,
        conjugeDataNasc: input.conjugeDataNasc || null,
        conjugeProfissao: input.conjugeProfissao || null,
        conjugeRendaMensal: input.conjugeRendaMensal || null,
        conjugeNacionalidade: input.conjugeNacionalidade || null,
        conjugeRne: input.conjugeRne || null,
        conjugeTelefone: input.conjugeTelefone || null,

        documentoUrl: input.documentoUrl || {},
      },
    });

    revalidatePath("/locacao");
    return { success: true, data: locatario };
  } catch (error: any) {
    console.error("Erro ao atualizar inquilino:", error);
    return { success: false, error: error.message || "Erro ao atualizar inquilino." };
  }
}

// 3.2 Atualizar Locador (Proprietário)
export async function updateLocador(id: string, input: any) {
  try {
    // 1. Recupera o registro atual para saber o nome original
    const currentLocador = await prisma.locador.findUnique({
      where: { id }
    });

    // 2. Atualiza o registro alvo principal
    const locador = await prisma.locador.update({
      where: { id },
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

    // 3. Sincroniza todos os homônimos existentes na base (mesmo nome, case-insensitive)
    const nomeBusca = currentLocador?.nome || input.nome;
    await prisma.locador.updateMany({
      where: {
        nome: {
          equals: nomeBusca,
          mode: 'insensitive'
        },
        id: {
          not: id // não re-atualiza o principal
        }
      },
      data: {
        nome: input.nome, // atualiza se mudou o nome
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
      }
    });

    revalidatePath("/locacao");
    return { success: true, data: locador };
  } catch (error: any) {
    console.error("Erro ao atualizar locador:", error);
    return { success: false, error: error.message || "Erro ao atualizar locador." };
  }
}

// 3.3 Atualizar Imóvel (valores e endereço)
export async function updateImovel(id: string, input: any) {
  try {
    const imovel = await prisma.imovel.update({
      where: { id },
      data: {
        tipo: input.tipo,
        cep: Number(input.cep),
        cidade: input.cidade,
        uf: input.uf,
        bairro: input.bairro,
        numero: Number(input.numero),
        valorAluguel: input.valorAluguel ? Math.round(parseFloat(input.valorAluguel) * 100) : null,
        valorCondominio: input.valorCondominio ? Math.round(parseFloat(input.valorCondominio) * 100) : null,
        valorIPTU: input.valorIPTU ? Math.round(parseFloat(input.valorIPTU) * 100) : null,
        area: Number(input.area) || undefined,
      },
    });

    revalidatePath("/locacao");
    return { success: true, data: imovel };
  } catch (error: any) {
    console.error("Erro ao atualizar imóvel:", error);
    return { success: false, error: error.message || "Erro ao atualizar imóvel." };
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
  documentoUrl?: any;
  tenantUploadedDocs?: any;

  // Novos campos adicionais
  taxaAdministracao?: number | null;
  taxaMultasEncargos?: number | null;
  taxaIntermediacao?: number | null;
  irrfResponsabilidade?: string | null;
  carenciaRepasse?: number | null;
  periodicidadeReajuste?: number | null;
  indiceReajuste?: string | null;
  multaQuebraContrato?: number | null;
  tipoMultaQuebra?: string | null;
  vencimentoQuebra?: string | null;
  descontoPontualidade?: number | null;
  tipoDesconto?: string | null;
  diasAntecedenciaDesc?: number | null;
  multaAtrasoPercentual?: number | null;
  diasCarenciaMulta?: number | null;
  jurosAtrasoPercentual?: number | null;
  diasCarenciaJuros?: number | null;

  // Primeiro período de cobrança (Vencimento em aberto)
  dataInicioPeriodo?: string | null;
  dataFimPeriodo?: string | null;
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

          // Novos campos
          taxaAdministracao: input.taxaAdministracao,
          taxaMultasEncargos: input.taxaMultasEncargos,
          taxaIntermediacao: input.taxaIntermediacao,
          irrfResponsabilidade: input.irrfResponsabilidade,
          carenciaRepasse: input.carenciaRepasse,

          periodicidadeReajuste: input.periodicidadeReajuste,
          indiceReajuste: input.indiceReajuste,
          multaQuebraContrato: input.multaQuebraContrato,
          tipoMultaQuebra: input.tipoMultaQuebra || "PERCENTUAL",
          vencimentoQuebra: input.vencimentoQuebra ? new Date(input.vencimentoQuebra) : null,

          descontoPontualidade: input.descontoPontualidade,
          tipoDesconto: input.tipoDesconto || "PERCENTUAL",
          diasAntecedenciaDesc: input.diasAntecedenciaDesc,

          multaAtrasoPercentual: input.multaAtrasoPercentual,
          diasCarenciaMulta: input.diasCarenciaMulta,
          jurosAtrasoPercentual: input.jurosAtrasoPercentual,
          diasCarenciaJuros: input.diasCarenciaJuros,
        },
      });

      // 1.1 Criar o primeiro Período Contratual vigente
      await tx.periodoContratoLocacao.create({
        data: {
          imovelLocacaoId: imovelLocacao.id,
          dataInicio: input.dataInicioPeriodo ? new Date(input.dataInicioPeriodo) : new Date(input.dataInicio),
          dataFim: input.dataFimPeriodo ? new Date(input.dataFimPeriodo) : new Date(input.dataFim),
          valorAluguel: input.valorAluguel,
          hasCondominio: input.valorCondominio > 0,
          valorCondominio: input.valorCondominio,
          hasIPTU: input.valorIPTU > 0,
          valorIPTU: input.valorIPTU,
          valorTotal: input.valorAluguel + input.valorCondominio + input.valorIPTU,
          descontoPontualidade: input.descontoPontualidade,
          tipoDesconto: input.tipoDesconto || "PERCENTUAL",
          diasAntecedenciaDesc: input.diasAntecedenciaDesc,
          multaAtrasoPercentual: input.multaAtrasoPercentual,
          diasCarenciaMulta: input.diasCarenciaMulta,
          jurosAtrasoPercentual: input.jurosAtrasoPercentual,
          diasCarenciaJuros: input.diasCarenciaJuros,
          indiceReajuste: input.indiceReajuste,
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
          documentoUrl: input.documentoUrl || {},
        },
      });

      // 4. Vincular inquilino (Locatario) e salvar novos documentos
      const locatarioAtual = await tx.locatario.findUnique({ where: { id: input.locatarioId } });
      let finalDocUrl = locatarioAtual?.documentoUrl || {};
      if (input.tenantUploadedDocs && Array.isArray(input.tenantUploadedDocs)) {
        const existingDocs = typeof finalDocUrl === 'object' && finalDocUrl !== null ? (finalDocUrl as any) : {};
        existingDocs.uploadedFinalDocs = input.tenantUploadedDocs;
        finalDocUrl = existingDocs;
      }

      await tx.locatario.update({
        where: { id: input.locatarioId },
        data: {
          contratoId: contratoCriado.id,
          documentoUrl: finalDocUrl,
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
