"use server";

import { prisma } from "@/lib/prisma";
import { TipoImovel } from "@/generated/prisma";
import { revalidatePath } from "next/cache";
import { geocodeAddress } from "@/lib/geocoding";

// Tipo do estado retornado pela action
export type FormState = {
  success: boolean;
  error?: string | null;
  message?: string | null;
};


export interface ImovelInput {
  codigo?: string;
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
  loteamentoId?: string | null;
  aluguelDados?: any;
  publicado?: boolean;
  titulo?: string;
  descricao?: string | null;
  quartos?: number | null;
  banheiros?: number | null;
  vagas?: number | null;
  area?: number;
  imagens?: string[];
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
      include: {
        loteamento: true,
      },
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

export async function saveOrUpdateImovelAction(prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const id = formData.get("id") as string | null;
    const codigoInput = formData.get("codigo") as string | null;
    const tipo = formData.get("tipo") as TipoImovel;
    const cepStr = formData.get("cep") as string;
    const cidade = formData.get("cidade") as string;
    const uf = formData.get("uf") as string;
    const bairro = formData.get("bairro") as string;
    const numeroStr = formData.get("numero") as string;
    const forVenda = formData.get("forVenda") === "on";
    const forLocacao = formData.get("forLocacao") === "on";
    const valorVendaStr = formData.get("valorVenda") as string | null;
    const valorAluguelStr = formData.get("valorAluguel") as string | null;
    const valorCondominioStr = formData.get("valorCondominio") as string | null;
    const valorIPTUStr = formData.get("valorIPTU") as string | null;
    let loteamentoId = formData.get("loteamentoId") as string | null;

    // Loteamento Creation On-the-fly
    const isCreatingLoteamento = formData.get("isCreatingLoteamento") === "on";
    const newLoteamentoNome = formData.get("newLoteamentoNome") as string | null;

    // Vitrine / Institutional site fields
    const publicado = formData.get("publicado") === "on";
    const titulo = (formData.get("titulo") as string | null) || "";
    const descricao = formData.get("descricao") as string | null;
    const quartosStr = formData.get("quartos") as string | null;
    const banheirosStr = formData.get("banheiros") as string | null;
    const vagasStr = formData.get("vagas") as string | null;
    const areaStr = formData.get("area") as string | null;
    const imagensJson = formData.get("imagens") as string | null;

    const quartos = quartosStr ? parseInt(quartosStr) : 0;
    const banheiros = banheirosStr ? parseInt(banheirosStr) : 0;
    const vagas = vagasStr ? parseInt(vagasStr) : 0;
    const area = areaStr ? parseInt(areaStr) : 0;
    const imagens = imagensJson ? JSON.parse(imagensJson) : [];

    // Validate inputs
    if (!bairro || !cidade || !uf || !cepStr || !numeroStr) {
      return { success: false, error: "Preencha todos os campos obrigatórios de endereço." };
    }

    if (!forVenda && !forLocacao) {
      return { success: false, error: "Selecione ao menos uma modalidade (Venda ou Locação)." };
    }

    if (tipo === "LOTE" && forLocacao) {
      return { success: false, error: "Loteamentos (Lotes) não podem ser alugados." };
    }

    const cep = parseInt(cepStr.replace(/\D/g, ""));
    const numero = parseInt(numeroStr);

    if (isNaN(cep) || isNaN(numero)) {
      return { success: false, error: "CEP e Número devem ser números válidos." };
    }

    // Geocodificação automática com Nominatim
    let latitude: number | null = null;
    let longitude: number | null = null;
    let shouldGeocode = true;

    if (id && id.trim() !== "") {
      const existing = await prisma.imovel.findUnique({
        where: { id },
      });
      if (existing) {
        if (
          existing.cep === cep &&
          existing.numero === numero &&
          existing.bairro === bairro &&
          existing.cidade === cidade &&
          existing.uf === uf &&
          existing.latitude !== null &&
          existing.longitude !== null
        ) {
          latitude = existing.latitude;
          longitude = existing.longitude;
          shouldGeocode = false;
        }
      }
    }

    if (shouldGeocode) {
      try {
        const coords = await geocodeAddress({
          cep,
          numero,
          bairro,
          cidade,
          uf,
        });
        if (coords) {
          latitude = coords.latitude;
          longitude = coords.longitude;
        }
      } catch (err) {
        console.error("Erro ao geocodificar imóvel:", err);
      }
    }

    const parseFormattedInt = (val: string | null): number | null => {
      if (!val || val.trim() === "") return null;
      // Se não contiver vírgula ou ponto, supõe que seja valor cru e multiplica por 100
      if (!val.includes(",") && !val.includes(".")) {
        const parsed = parseFloat(val);
        return isNaN(parsed) ? null : Math.round(parsed * 100);
      }
      const raw = val.replace(/\D/g, "");
      return raw ? parseInt(raw) : null;
    };

    const valorVenda = forVenda ? parseFormattedInt(valorVendaStr) : null;
    const valorAluguel = forLocacao ? parseFormattedInt(valorAluguelStr) : null;
    const valorCondominio = forLocacao ? parseFormattedInt(valorCondominioStr) : null;
    const valorIPTU = forLocacao ? parseFormattedInt(valorIPTUStr) : null;
    const valorTotal = forLocacao ? ((valorAluguel || 0) + (valorCondominio || 0) + (valorIPTU || 0)) : null;

    // If CONDOMINIO and isCreatingLoteamento is true, let's create the loteamento first
    if (tipo === "CONDOMINIO" && isCreatingLoteamento && newLoteamentoNome && newLoteamentoNome.trim()) {
      const condAdminNome = formData.get("condAdminNome") as string | null;
      const condAdminTel = formData.get("condAdminTel") as string | null;
      const condAdminEmail = formData.get("condAdminEmail") as string | null;
      const condAdminSite = formData.get("condAdminSite") as string | null;
      const condSindicoNome = formData.get("condSindicoNome") as string | null;
      const condSindicoTel = formData.get("condSindicoTel") as string | null;
      const condResponsavelPag = formData.get("condResponsavelPag") as string | null;
      const condDataChecagem = formData.get("condDataChecagem") as string | null;
      const condDocDescricao = formData.get("condDocDescricao") as string | null;

      const slug = newLoteamentoNome
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-");

      const loteamento = await prisma.loteamento.create({
        data: {
          nome: newLoteamentoNome,
          slug,
          cidade,
          uf: uf.toUpperCase(),
          descricao: `Condomínio ${newLoteamentoNome}`,
          dadosCondominio: {
            adminNome: condAdminNome || null,
            adminTel: condAdminTel || null,
            adminEmail: condAdminEmail || null,
            adminSite: condAdminSite || null,
            sindicoNome: condSindicoNome || null,
            sindicoTel: condSindicoTel || null,
            responsavelPag: condResponsavelPag || null,
            dataChecagem: condDataChecagem || null,
            docDescricao: condDocDescricao || null,
          },
        },
      });
      loteamentoId = loteamento.id;
    }

    const aluguelDadosRaw = formData.get("aluguelDados") as string | null;
    const aluguelDados = aluguelDadosRaw ? JSON.parse(aluguelDadosRaw) : null;

    let finalCodigo = codigoInput?.trim();
    if (!finalCodigo || finalCodigo === "(Gerado automaticamente)") {
      finalCodigo = await generateCodigo();
    }

    const imobId = await getOrCreateDefaultImobId();

    if (id && id.trim() !== "") {
      // Update
      const existing = await prisma.imovel.findUnique({
        where: { codigo: finalCodigo },
      });
      if (existing && existing.id !== id) {
        return { success: false, error: `Já existe outro imóvel cadastrado com o código ${finalCodigo}.` };
      }

      await prisma.imovel.update({
        where: { id },
        data: {
          codigo: finalCodigo,
          numero,
          bairro,
          cidade,
          uf: uf.toUpperCase(),
          cep,
          latitude,
          longitude,
          tipo,
          forVenda,
          forLocacao,
          valorVenda,
          valorAluguel,
          valorCondominio,
          valorIPTU,
          valorTotal,
          loteamentoId: tipo === "CONDOMINIO" ? (loteamentoId || null) : null,
          aluguelDados,
          publicado,
          titulo,
          descricao,
          quartos,
          banheiros,
          vagas,
          area,
          imagens,
        },
      });
    } else {
      // Create
      const existing = await prisma.imovel.findUnique({
        where: { codigo: finalCodigo },
      });
      if (existing) {
        return { success: false, error: `Já existe um imóvel cadastrado com o código ${finalCodigo}.` };
      }

      await prisma.imovel.create({
        data: {
          codigo: finalCodigo,
          numero,
          bairro,
          cidade,
          uf: uf.toUpperCase(),
          cep,
          latitude,
          longitude,
          tipo,
          forVenda,
          forLocacao,
          valorVenda,
          valorAluguel,
          valorCondominio,
          valorIPTU,
          valorTotal,
          loteamentoId: tipo === "CONDOMINIO" ? (loteamentoId || null) : null,
          aluguelDados,
          imobId,
          publicado,
          titulo,
          descricao,
          quartos,
          banheiros,
          vagas,
          area,
          imagens,
        },
      });
    }

    revalidatePath("/imoveis"); 0
    return { success: true, message: id ? "Imóvel atualizado com sucesso!" : "Imóvel cadastrado com sucesso!" };
  } catch (error: any) {
    console.error("Erro ao salvar imóvel:", error);
    return { success: false, error: error.message || "Erro desconhecido ao salvar imóvel." };
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

export async function getLocadores() {
  try {
    const list = await prisma.locador.findMany({
      orderBy: {
        nome: "asc",
      },
    });
    
    // Deduplica a lista de locadores pelo nome (case-insensitive),
    // priorizando o registro que possui CPF/CNPJ preenchido.
    const uniqueMap = new Map<string, typeof list[number]>();
    for (const loc of list) {
      const key = loc.nome.trim().toLowerCase();
      const existing = uniqueMap.get(key);
      if (!existing || (!existing.cpfCnpj && loc.cpfCnpj)) {
        uniqueMap.set(key, loc);
      }
    }
    
    const uniqueList = Array.from(uniqueMap.values()).sort((a, b) => 
      a.nome.localeCompare(b.nome, 'pt-BR')
    );

    return { success: true, data: uniqueList };
  } catch (error: any) {
    console.error("Erro ao buscar proprietários:", error);
    return { success: false, error: error.message || "Erro ao buscar proprietários." };
  }
}

export async function createLocador(input: {
  nome: string;
  cpfCnpj: string;
  telefone?: any;
  email: string;
  endereco?: any;
  dataNasc: string;
  rg: string;
  orgaoEmissor: string;
  estadoCivil: string;
  profissao: string;
  nacionalidade: string;
  genero: string;
  documentoUrl?: any;
}) {
  try {
    const locador = await prisma.locador.create({
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
    return { success: true, data: locador };
  } catch (error: any) {
    console.error("Erro ao cadastrar proprietário:", error);
    return { success: false, error: error.message || "Erro ao cadastrar proprietário." };
  }
}

export async function getLoteamentos() {
  try {
    const loteamentos = await prisma.loteamento.findMany({
      orderBy: {
        nome: "asc",
      },
    });
    return { success: true, data: loteamentos };
  } catch (error: any) {
    console.error("Erro ao buscar loteamentos/condomínios:", error);
    return { success: false, error: error.message || "Erro ao buscar condomínios." };
  }
}

export async function createLoteamento(input: { nome: string; cidade: string; uf: string; descricao?: string; dadosCondominio?: any }) {
  try {
    const slug = input.nome
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");

    const loteamento = await prisma.loteamento.create({
      data: {
        nome: input.nome,
        slug,
        cidade: input.cidade,
        uf: input.uf.toUpperCase(),
        descricao: input.descricao || `Condomínio ${input.nome}`,
        dadosCondominio: input.dadosCondominio || null,
      },
    });
    return { success: true, data: loteamento };
  } catch (error: any) {
    console.error("Erro ao criar loteamento/condomínio:", error);
    return { success: false, error: error.message || "Erro ao criar condomínio." };
  }
}


async function generateCodigo() {

  let maxNum = 0
  let codigo = ''

  const imoveis = await prisma.imovel.findMany({
    select: { codigo: true }
  });
  for (const im of imoveis) {
    const match = im.codigo.match(/^IMB-(\d+)$/i);
    if (match) {
      const num = parseInt(match[1]);
      if (num > maxNum) {
        maxNum = num;
      }
    }
  }
  codigo = `IMB-${String(maxNum + 1).padStart(3, '0')}`;

  return codigo;
}

export async function backfillImoveisCoordenadas() {
  try {
    const imoveisSemCoords = await prisma.imovel.findMany({
      where: {
        OR: [
          { latitude: null },
          { longitude: null }
        ]
      }
    });

    console.log(`[Backfill] Encontrados ${imoveisSemCoords.length} imóveis sem coordenadas.`);

    let successCount = 0;
    let failCount = 0;

    for (const imovel of imoveisSemCoords) {
      const coords = await geocodeAddress({
        cep: imovel.cep,
        numero: imovel.numero,
        bairro: imovel.bairro,
        cidade: imovel.cidade,
        uf: imovel.uf,
      });

      if (coords) {
        await prisma.imovel.update({
          where: { id: imovel.id },
          data: {
            latitude: coords.latitude,
            longitude: coords.longitude,
          },
        });
        successCount++;
      } else {
        failCount++;
      }

      // Nominatim rate-limiting
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    revalidatePath("/imoveis");
    return {
      success: true,
      message: `Backfill concluído. Sucesso: ${successCount}, Falhas: ${failCount}.`,
      data: { successCount, failCount }
    };
  } catch (error: any) {
    console.error("[Backfill] Erro crítico no backfill:", error);
    return { success: false, error: error.message || "Erro crítico no backfill." };
  }
}