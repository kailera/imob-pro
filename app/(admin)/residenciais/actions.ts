"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserContext } from "@/lib/auth";
import type { Prisma } from "@/generated/prisma";
import type { ActionResult, CategoriaDespesa, ResidenciaisPageData, ResidencialView, TipoRateio } from "./types";

const CATEGORIAS = new Set<CategoriaDespesa>(["INTERNET", "GAS", "LIMPEZA", "SEGURANCA", "JARDINAGEM", "ENERGIA_COMUM", "OUTROS"]);
const RATEIOS = new Set<TipoRateio>(["IGUALITARIO", "VALOR_FIXO", "PERCENTUAL", "NAO_RATEAR"]);

async function getActiveImobId() {
  const context = await requireUserContext();
  return context.tenantId;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function endereco(imovel: { logradouro: string | null; numero: number; bairro: string; cidade: string; uf: string }) {
  return `${imovel.logradouro?.trim() || "Endereço"}, ${imovel.numero} — ${imovel.bairro}, ${imovel.cidade}/${imovel.uf}`;
}

const imovelComProprietariosInclude = {
  imovelLocacaos: {
    include: {
      locadors: { select: { nome: true } },
      person: { select: { name: true } },
    },
  },
  leases: {
    include: {
      parties: {
        where: { role: { in: ["LANDLORD" as const, "TENANT" as const, "CO_TENANT" as const] } },
        include: { person: { select: { name: true } } },
      },
    },
  },
  contratoImovelLocacaos: {
    include: {
      locatarios: { select: { nome: true } },
      imovelLocacao: { select: { dataInicio: true, dataFim: true } },
    },
  },
} satisfies Prisma.ImovelInclude;

type ImovelComProprietarios = Prisma.ImovelGetPayload<{ include: typeof imovelComProprietariosInclude }>;

function nomesProprietarios(imovel: ImovelComProprietarios) {
  const nomes = new Set<string>();
  for (const locacao of imovel.imovelLocacaos) {
    for (const locador of locacao.locadors) if (locador.nome.trim()) nomes.add(locador.nome.trim());
    if (locacao.person?.name.trim()) nomes.add(locacao.person.name.trim());
  }
  for (const lease of imovel.leases) {
    for (const party of lease.parties) if (party.person.name.trim()) nomes.add(party.person.name.trim());
  }
  const aluguelDados = imovel.aluguelDados;
  if (aluguelDados && typeof aluguelDados === "object" && !Array.isArray(aluguelDados)) {
    const dados = aluguelDados as Record<string, unknown>;
    if (typeof dados.proprietarioNome === "string" && dados.proprietarioNome.trim()) nomes.add(dados.proprietarioNome.trim());
    if (dados.proprietario && typeof dados.proprietario === "object" && !Array.isArray(dados.proprietario)) {
      const nome = (dados.proprietario as Record<string, unknown>).nome;
      if (typeof nome === "string" && nome.trim()) nomes.add(nome.trim());
    }
  }
  return [...nomes].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function nomesInquilinos(imovel: ImovelComProprietarios) {
  const nomes = new Set<string>();
  const agora = new Date();
  for (const lease of imovel.leases) {
    if (lease.status !== "ACTIVE") continue;
    for (const party of lease.parties) {
      if (["TENANT", "CO_TENANT"].includes(party.role) && party.person.name.trim()) nomes.add(party.person.name.trim());
    }
  }
  for (const contrato of imovel.contratoImovelLocacaos) {
    const locacao = contrato.imovelLocacao;
    if (locacao && (agora < locacao.dataInicio || agora > locacao.dataFim)) continue;
    for (const locatario of contrato.locatarios) if (locatario.nome.trim()) nomes.add(locatario.nome.trim());
  }
  return [...nomes].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function serializeImovel(imovel: ImovelComProprietarios) {
  return {
    id: imovel.id,
    codigo: imovel.codigo,
    titulo: imovel.titulo,
    endereco: endereco(imovel),
    proprietarios: nomesProprietarios(imovel),
    inquilinos: nomesInquilinos(imovel),
  };
}

const residencialInclude = {
  imoveis: { include: imovelComProprietariosInclude, orderBy: { codigo: "asc" as const } },
  despesas: { orderBy: [{ ativo: "desc" as const }, { nome: "asc" as const }] },
  manutencoes: { include: { imovel: true }, orderBy: { dataManutencao: "desc" as const } },
} satisfies Prisma.ResidencialInclude;

type ResidencialCompleto = Prisma.ResidencialGetPayload<{ include: typeof residencialInclude }>;

function serialize(item: ResidencialCompleto): ResidencialView {
  return {
    id: item.id,
    nome: item.nome,
    tipo: item.tipo,
    descricao: item.descricao,
    ativo: item.ativo,
    imoveis: item.imoveis.map(serializeImovel),
    despesas: item.despesas.map(despesa => ({
      id: despesa.id,
      nome: despesa.nome,
      categoria: despesa.categoria,
      valor: Number(despesa.valor),
      inicioVigencia: despesa.inicioVigencia.toISOString().slice(0, 10),
      fimVigencia: despesa.fimVigencia?.toISOString().slice(0, 10) ?? null,
      ativo: despesa.ativo,
      observacao: despesa.observacao,
    })),
    manutencoes: item.manutencoes.map(manutencao => ({
      id: manutencao.id,
      descricao: manutencao.descricao,
      dataManutencao: manutencao.dataManutencao.toISOString().slice(0, 10),
      valor: Number(manutencao.valor),
      status: manutencao.status,
      escopo: manutencao.escopo,
      tipoRateio: manutencao.tipoRateio,
      rateio: manutencao.rateio && typeof manutencao.rateio === "object" && !Array.isArray(manutencao.rateio)
        ? manutencao.rateio as Record<string, number>
        : null,
      imovel: manutencao.imovel ? {
        id: manutencao.imovel.id,
        codigo: manutencao.imovel.codigo,
        titulo: manutencao.imovel.titulo,
        endereco: endereco(manutencao.imovel),
        proprietarios: [],
        inquilinos: [],
      } : null,
    })),
  };
}

export async function getResidenciais(): Promise<ActionResult<ResidenciaisPageData>> {
  try {
    const imobId = await getActiveImobId();
    const [residenciais, disponiveis] = await Promise.all([
      prisma.residencial.findMany({ where: { imobId }, include: residencialInclude, orderBy: { nome: "asc" } }),
      prisma.imovel.findMany({ where: { imobId, residencialId: null }, include: imovelComProprietariosInclude, orderBy: { codigo: "asc" } }),
    ]);
    return {
      success: true,
      data: {
        residenciais: residenciais.map(serialize),
        imoveisDisponiveis: disponiveis.map(serializeImovel),
      },
    };
  } catch (error) {
    return { success: false, error: errorMessage(error, "Erro ao carregar residenciais.") };
  }
}

export async function saveResidencial(input: { id?: string; nome: string; tipo: "RESIDENCIAL" | "CONDOMINIO"; descricao?: string; imovelIds: string[] }): Promise<ActionResult<{ id: string }>> {
  try {
    const imobId = await getActiveImobId();
    const nome = input.nome.trim();
    if (!nome) return { success: false, error: "Informe o nome do residencial ou condomínio." };
    const uniqueIds = [...new Set(input.imovelIds)];
    const validCount = await prisma.imovel.count({
      where: { id: { in: uniqueIds }, imobId, OR: [{ residencialId: null }, ...(input.id ? [{ residencialId: input.id }] : [])] },
    });
    if (validCount !== uniqueIds.length) return { success: false, error: "Um ou mais imóveis já pertencem a outro residencial." };

    const id = await prisma.$transaction(async tx => {
      const residencial = input.id
        ? await tx.residencial.update({ where: { id: input.id, imobId }, data: { nome, tipo: input.tipo, descricao: input.descricao?.trim() || null } })
        : await tx.residencial.create({ data: { imobId, nome, tipo: input.tipo, descricao: input.descricao?.trim() || null } });
      await tx.imovel.updateMany({ where: { residencialId: residencial.id, id: { notIn: uniqueIds } }, data: { residencialId: null } });
      await tx.imovel.updateMany({ where: { id: { in: uniqueIds }, imobId }, data: { residencialId: residencial.id } });
      return residencial.id;
    });
    revalidatePath("/residenciais");
    revalidatePath("/manutencoes");
    return { success: true, data: { id } };
  } catch (error) {
    return { success: false, error: errorMessage(error, "Erro ao salvar residencial.") };
  }
}

export async function saveDespesaResidencial(input: {
  residencialId: string; nome: string; categoria: CategoriaDespesa; valor: number;
  inicioVigencia: string; fimVigencia?: string; observacao?: string; confirmarSobrescritaGas?: boolean;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const imobId = await getActiveImobId();
    if (!CATEGORIAS.has(input.categoria)) return { success: false, error: "Água e IPTU devem permanecer cadastrados na locação do imóvel." };
    if (!input.nome.trim()) return { success: false, error: "Informe o nome da despesa." };
    if (!Number.isFinite(input.valor) || input.valor <= 0) return { success: false, error: "Informe um valor maior que zero." };
    const residencial = await prisma.residencial.findFirst({ where: { id: input.residencialId, imobId }, select: { id: true } });
    if (!residencial) return { success: false, error: "Residencial não encontrado." };
    if (input.categoria === "GAS") {
      const gasConflictCount = await prisma.lease.count({
        where: { tenantId: imobId, status: "ACTIVE", property: { residencialId: input.residencialId }, utilities: { some: { type: "GAS", amount: { gt: 0 } } } },
      });
      if (gasConflictCount > 0 && !input.confirmarSobrescritaGas) {
        return { success: false, error: `O gás do residencial substituirá o gás de ${gasConflictCount} locação(ões) ativa(s). Confirme para continuar.`, gasConflictCount };
      }
    }
    const inicio = new Date(`${input.inicioVigencia}T12:00:00Z`);
    const fim = input.fimVigencia ? new Date(`${input.fimVigencia}T12:00:00Z`) : null;
    if (Number.isNaN(inicio.getTime()) || (fim && fim < inicio)) return { success: false, error: "Revise a vigência da despesa." };
    const saved = await prisma.residencialDespesa.create({ data: {
      residencialId: input.residencialId, nome: input.nome.trim(), categoria: input.categoria,
      valor: input.valor, inicioVigencia: inicio, fimVigencia: fim, observacao: input.observacao?.trim() || null,
    }, select: { id: true } });
    revalidatePath("/residenciais");
    return { success: true, data: saved, warning: input.categoria === "GAS" ? "O gás do residencial terá prioridade na geração das cobranças." : undefined };
  } catch (error) {
    return { success: false, error: errorMessage(error, "Erro ao salvar despesa.") };
  }
}

export async function toggleDespesaResidencial(id: string): Promise<ActionResult> {
  try {
    const imobId = await getActiveImobId();
    const despesa = await prisma.residencialDespesa.findFirst({ where: { id, residencial: { imobId } }, select: { ativo: true } });
    if (!despesa) return { success: false, error: "Despesa não encontrada." };
    await prisma.residencialDespesa.update({ where: { id }, data: { ativo: !despesa.ativo } });
    revalidatePath("/residenciais");
    return { success: true, data: undefined };
  } catch (error) { return { success: false, error: errorMessage(error, "Erro ao alterar despesa.") }; }
}

export async function saveManutencaoResidencial(input: {
  id?: string; residencialId: string; imovelId?: string; descricao: string; dataManutencao: string; valor: number;
  status: "EM_ANDAMENTO" | "FINALIZADA"; tipoRateio: TipoRateio; rateio?: Record<string, number>;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const imobId = await getActiveImobId();
    if (!input.descricao.trim()) return { success: false, error: "Descreva o serviço ou manutenção." };
    if (!Number.isFinite(input.valor) || input.valor <= 0) return { success: false, error: "Informe um valor maior que zero." };
    if (!RATEIOS.has(input.tipoRateio)) return { success: false, error: "Regra de rateio inválida." };
    const residencial = await prisma.residencial.findFirst({ where: { id: input.residencialId, imobId }, include: { imoveis: { select: { id: true } } } });
    if (!residencial) return { success: false, error: "Residencial não encontrado." };
    if (input.id) {
      const manutencao = await prisma.residencialManutencao.findFirst({
        where: { id: input.id, residencialId: input.residencialId, residencial: { imobId } },
        select: { id: true },
      });
      if (!manutencao) return { success: false, error: "Manutenção não encontrada neste residencial." };
    }
    if (input.imovelId && !residencial.imoveis.some(item => item.id === input.imovelId)) return { success: false, error: "O imóvel selecionado não pertence a este residencial." };
    const rateio = input.tipoRateio === "NAO_RATEAR" ? null : (input.rateio ?? null);
    if (["VALOR_FIXO", "PERCENTUAL"].includes(input.tipoRateio) && (!rateio || Object.keys(rateio).length === 0)) {
      return { success: false, error: "Informe os valores do rateio por imóvel." };
    }
    if (rateio) {
      const imovelIds = new Set(residencial.imoveis.map(item => item.id));
      const entries = Object.entries(rateio);
      if (entries.some(([id, valor]) => !imovelIds.has(id) || !Number.isFinite(valor) || valor < 0)) {
        return { success: false, error: "O rateio contém unidade ou valor inválido." };
      }
      const totalRateio = entries.reduce((total, [, valor]) => total + valor, 0);
      if (input.tipoRateio === "PERCENTUAL" && Math.abs(totalRateio - 100) > 0.01) {
        return { success: false, error: "O rateio percentual deve totalizar 100%." };
      }
      if (input.tipoRateio === "VALOR_FIXO" && Math.abs(totalRateio - input.valor) > 0.01) {
        return { success: false, error: "A soma do rateio por unidade deve ser igual ao valor da manutenção." };
      }
    }
    const data: Prisma.ResidencialManutencaoUncheckedCreateInput = {
      residencialId: input.residencialId, imovelId: input.imovelId || null,
      descricao: input.descricao.trim(), dataManutencao: new Date(`${input.dataManutencao}T12:00:00Z`), valor: input.valor,
      status: input.status, escopo: input.imovelId ? "IMOVEL_ESPECIFICO" : "GERAL", tipoRateio: input.tipoRateio,
      rateio: rateio as Prisma.InputJsonValue | undefined,
    };
    const saved = input.id
      ? await prisma.residencialManutencao.update({ where: { id: input.id }, data, select: { id: true } })
      : await prisma.residencialManutencao.create({ data, select: { id: true } });
    revalidatePath("/residenciais");
    revalidatePath("/manutencoes");
    return { success: true, data: saved };
  } catch (error) { return { success: false, error: errorMessage(error, "Erro ao salvar manutenção.") }; }
}
