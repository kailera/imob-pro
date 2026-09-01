"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma";
import { requireUserContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { criarItensCobranca } from "@/lib/financeiro/boleto-composicao";
import {
  cobrancaEhRascunhoReutilizavel,
  criarChaveCobrancaMensal,
  obterCompetenciaDaCobranca,
} from "@/lib/financeiro/cobranca-rascunho";
import { calcularCondominioDaCobranca } from "@/lib/locacao/condominio";
import {
  calcularAluguelProporcionalCompetencia,
  calcularInicioCompetencia,
  criarDataVencimento,
  resolverVigenciaCobrancaPorCompetencia,
} from "@/lib/locacao/financeiro";
import { adicionarDiasUTC } from "@/lib/locacao/periodos";
import { listarPendenciasInter, type InterReadinessIssue } from "@/lib/locacao/inter-readiness";
import { calcularIptuDaCobranca } from "@/lib/locacao/iptu";
import { resolverDespesasResidencial } from "@/lib/residenciais/cobranca";

type ContractChargeReference = {
  kind: "LEASE" | "LEGACY";
  id: string;
};

type ContractChargeResult =
  | {
      success: true;
      created: boolean;
      transactionId: string;
      competence: string;
      dueDate: string;
      message: string;
    }
  | {
      success: false;
      error: string;
      issues?: InterReadinessIssue[];
    };

function validarEntrada(reference: ContractChargeReference, competence: string) {
  if (!reference || !["LEASE", "LEGACY"].includes(reference.kind) || !reference.id?.trim()) {
    return "Contrato inválido.";
  }
  const match = competence.match(/^(\d{4})-(\d{2})$/);
  if (!match || Number(match[2]) < 1 || Number(match[2]) > 12) {
    return "Competência inválida. Use o formato AAAA-MM.";
  }
  return null;
}

function parseLegacyAddress(value: unknown) {
  if (!value) return null;
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : { logradouro: value };
  } catch {
    return { logradouro: value };
  }
}

function obterCompetenciaEfetiva(input: {
  metadata: unknown;
  descricao: string;
  dataVencimento: Date;
}) {
  const metadata = input.metadata && typeof input.metadata === "object" && !Array.isArray(input.metadata)
    ? input.metadata as Record<string, unknown>
    : {};
  if (metadata.origin === "MANUAL_AGREEMENT" || /^acordo de/i.test(input.descricao.trim())) {
    return null;
  }
  const saved = obterCompetenciaDaCobranca(input.metadata);
  if (saved) return saved;
  const descriptionMatch = input.descricao.match(/Competência\s+(\d{2})\/(\d{4})/i);
  if (descriptionMatch) return `${descriptionMatch[2]}-${descriptionMatch[1]}`;
  return input.dataVencimento.toISOString().slice(0, 7);
}

function issue(code: string, message: string): InterReadinessIssue {
  return { code, group: "CONTRATO", message };
}

async function gerarCobrancaCanonica(
  leaseId: string,
  tenantId: string,
  competence: string,
): Promise<ContractChargeResult> {
  const lease = await prisma.lease.findFirst({
    where: { id: leaseId, tenantId },
    include: {
      property: { include: { residencial: { include: { despesas: true } } } },
      iptu: true,
      condominium: true,
      utilities: true,
      terms: true,
      termsPeriods: { orderBy: { effectiveFrom: "asc" } },
      parties: {
        where: { role: "TENANT" },
        include: { person: { include: { addresses: true } } },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      },
    },
  });
  if (!lease) return { success: false, error: "Contrato não encontrado." };

  const tenant = lease.parties[0]?.person ?? null;
  const issues = listarPendenciasInter({
    tenant: tenant ? {
      nome: tenant.name,
      cpfCnpj: tenant.cpfCnpj,
      address: tenant.addresses[0] ?? null,
    } : null,
    property: lease.property,
  });
  if (lease.status !== "ACTIVE") {
    issues.push(issue("LEASE_NOT_ACTIVE", "O contrato precisa estar ativo para gerar cobranças."));
  }
  if (!lease.terms) {
    issues.push(issue("LEASE_TERMS_REQUIRED", "Preencha o controle locatício do contrato."));
  }
  if (lease.termsPeriods.length === 0) {
    issues.push(issue("LEASE_PERIOD_REQUIRED", "Cadastre ao menos um período de vigência para a cobrança."));
  }
  if (issues.length > 0) {
    return { success: false, error: "Existem dados obrigatórios pendentes.", issues };
  }

  const terms = lease.terms!;
  const competenceStart = calcularInicioCompetencia(competence);
  const competenceEnd = new Date(Date.UTC(
    competenceStart.getUTCFullYear(),
    competenceStart.getUTCMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  ));
  if (
    (lease.startDate && competenceEnd < lease.startDate)
    || (lease.endDate && competenceStart > lease.endDate)
  ) {
    return {
      success: false,
      error: "A competência escolhida está fora da vigência do contrato.",
      issues: [issue("COMPETENCE_OUTSIDE_LEASE", "Escolha uma competência dentro da vigência contratual.")],
    };
  }
  const vigencia = resolverVigenciaCobrancaPorCompetencia({
    periodos: lease.termsPeriods,
    competencia: competence,
    diaVencimentoPadrao: terms.paymentDueDay,
    primeiroVencimento: terms.firstPeriodDueDate,
    fimPeriodo: terms.firstPeriodEndDay,
  });
  if (!vigencia) {
    return {
      success: false,
      error: "A competência escolhida não está coberta pela vigência do contrato.",
      issues: [issue("COMPETENCE_OUTSIDE_LEASE", "Escolha uma competência dentro da vigência contratual.")],
    };
  }
  if (!vigencia.periodo) {
    return {
      success: false,
      error: "A competência escolhida não possui um período contratual configurado.",
      issues: [issue("PERIOD_NOT_FOUND", `Cadastre o período contratual da competência ${competence}.`)],
    };
  }
  const period = vigencia.periodo;
  if (period.reviewStatus !== "REVIEWED") {
    return {
      success: false,
      error: "O período escolhido ainda não foi conferido.",
      issues: [issue("PERIOD_NOT_REVIEWED", `Confira o período contratual da competência ${competence}.`)],
    };
  }
  if (lease.billingStartDate && vigencia.dataVencimento < lease.billingStartDate) {
    return {
      success: false,
      error: "A competência é anterior ao início configurado para as cobranças.",
      issues: [issue("BEFORE_BILLING_START", "Escolha uma competência posterior ao início das cobranças.")],
    };
  }

  const legacyContracts = lease.legacyCode
    ? await prisma.contratoImovelLocacao.findMany({
        where: { imobId: tenantId, id: lease.legacyCode },
        select: { id: true },
      })
    : [];
  const billingKey = criarChaveCobrancaMensal({ leaseId: lease.id }, competence);
  const existingTransactions = await prisma.transacaoFinanceira.findMany({
    where: {
      OR: [
        { leaseId: lease.id },
        { billingKey },
        ...(legacyContracts.length
          ? [{ contratoId: { in: legacyContracts.map(contract => contract.id) } }]
          : []),
      ],
      categoria: "ALUGUEL",
      tipo: "RECEITA",
    },
    orderBy: { createdAt: "desc" },
  });
  const sameCompetence = existingTransactions.filter(transaction => (
    obterCompetenciaEfetiva(transaction) === competence
  ));
  const existingLeaseCharge = await prisma.leaseCharge.findUnique({
    where: {
      leaseId_competence_chargeType: {
        leaseId: lease.id,
        competence,
        chargeType: "RENT",
      },
    },
    select: { status: true },
  });
  if (existingLeaseCharge && existingLeaseCharge.status !== "PENDING" && sameCompetence.length === 0) {
    return {
      success: false,
      error: "Esta competência já possui um lançamento contratual concluído.",
      issues: [issue("LEASE_CHARGE_ALREADY_CLOSED", "Consulte o histórico antes de criar outra cobrança para a mesma competência.")],
    };
  }
  const registered = sameCompetence.find(transaction => !cobrancaEhRascunhoReutilizavel(transaction));
  if (registered) {
    return {
      success: true,
      created: false,
      transactionId: registered.id,
      competence,
      dueDate: registered.dataVencimento.toISOString(),
      message: "A cobrança desta competência já existe e foi preservada.",
    };
  }

  const rateioAluguel = calcularAluguelProporcionalCompetencia(
    lease.termsPeriods.map(item => ({
      id: item.id,
      effectiveFrom: item.effectiveFrom,
      effectiveTo: item.effectiveTo,
      rentAmount: Number(item.rentAmount),
    })),
    competence,
    terms.firstPeriodEndDay,
  );
  if (!rateioAluguel) {
    return {
      success: false,
      error: "A competência possui uma lacuna entre vigências do aluguel.",
      issues: [issue("PERIOD_GAP", `Revise os períodos contratuais da competência ${competence}.`)],
    };
  }
  const rentValue = rateioAluguel.valor;
  const iptu = calcularIptuDaCobranca(lease.iptu, vigencia.dataVencimento, {
    legacySystem: lease.legacySystem,
  });
  const condominiumValue = calcularCondominioDaCobranca(lease.condominium);
  const waterValue = Number(lease.utilities.find(item => item.type === "WATER")?.amount ?? 0);
  const electricityValue = Number(lease.utilities.find(item => item.type === "ELECTRICITY")?.amount ?? 0);
  const leaseGasValue = Number(lease.utilities.find(item => item.type === "GAS")?.amount ?? 0);
  const residentialExpenses = resolverDespesasResidencial(
    lease.property?.residencial?.despesas,
    vigencia.dataVencimento,
    leaseGasValue,
  );
  const gasValue = residentialExpenses.gasValue;
  const total = Number((rentValue
    + condominiumValue
    + iptu.valor
    + waterValue
    + electricityValue
    + gasValue
    + residentialExpenses.additionalTotal).toFixed(2));
  if (total <= 0) {
    return {
      success: false,
      error: "O valor calculado para a cobrança é inválido.",
      issues: [issue("CHARGE_AMOUNT_INVALID", `Confira os valores do período contratual da competência ${competence}.`)],
    };
  }
  const metadata = {
    competence,
    leaseId: lease.id,
    termsPeriodId: period.id,
    rentValue,
    rentProration: rateioAluguel.rateado ? {
      startDate: rateioAluguel.inicio.toISOString(),
      endDate: rateioAluguel.fim.toISOString(),
      totalDays: rateioAluguel.diasTotais,
      portions: rateioAluguel.parcelas,
    } : null,
    condominiumValue,
    iptuValue: iptu.valor,
    waterValue,
    electricityValue,
    gasValue,
    residentialExpenses: residentialExpenses.residentialExpenses,
    residentialGasOverridden: residentialExpenses.gasOverridden,
    iptuInstallment: iptu.numeroParcela,
    iptuInstallments: iptu.quantidadeParcelas,
    billingConditions: {
      discountValue: Number(period.earlyPaymentDiscount ?? terms.earlyPaymentDiscount ?? 0),
      discountType: period.discountType ?? terms.discountType ?? "FIXED",
      discountDaysBefore: period.discountDaysBefore ?? terms.discountDaysBefore ?? 0,
      lateFeePercentage: Number(period.lateFeePercentage ?? terms.lateFeePercentage ?? 0),
      lateInterestMonthly: Number(period.lateInterestMonthly ?? terms.lateInterestMonthly ?? 0),
    },
    dueDay: period.paymentDueDay,
    source: "LEASE_TERMS_PERIOD",
  };
  const items = criarItensCobranca({
    rentValue,
    condominiumValue,
    iptuValue: iptu.valor,
    waterValue,
    electricityValue,
    gasValue,
    residentialExpenses: residentialExpenses.residentialExpenses,
  }, metadata.billingConditions);
  const [year, month] = competence.split("-").map(Number);
  const description = `Aluguel - ${tenant!.name} - Competência ${String(month).padStart(2, "0")}/${year}`;
  const reusable = sameCompetence[0] ?? null;
  const duplicateIds = sameCompetence.slice(1).map(transaction => transaction.id);

  const transactionId = await prisma.$transaction(async tx => {
    const current = await tx.lease.findFirst({
      where: { id: lease.id, tenantId, status: "ACTIVE" },
      select: { id: true },
    });
    if (!current) throw new Error("O contrato deixou de estar ativo durante a geração.");

    await tx.leaseCharge.upsert({
      where: {
        leaseId_competence_chargeType: {
          leaseId: lease.id,
          competence,
          chargeType: "RENT",
        },
      },
      create: {
        leaseId: lease.id,
        termsPeriodId: period.id,
        competence,
        description,
        chargeType: "RENT",
        amount: total,
        calculationData: metadata as Prisma.InputJsonValue,
        dueDate: vigencia.dataVencimento,
      },
      update: {
        termsPeriodId: period.id,
        description,
        amount: total,
        calculationData: metadata as Prisma.InputJsonValue,
        dueDate: vigencia.dataVencimento,
        status: "PENDING",
        paidDate: null,
      },
    });

    let id: string;
    if (reusable) {
      await tx.transacaoFinanceira.update({
        where: { id: reusable.id },
        data: {
          billingKey,
          descricao: description,
          valor: total,
          dataVencimento: vigencia.dataVencimento,
          leaseId: lease.id,
          contratoId: null,
          imovelId: lease.propertyId,
          metadata: metadata as Prisma.InputJsonValue,
        },
      });
      await tx.boletoChargeItem.deleteMany({ where: { transacaoId: reusable.id } });
      await tx.boletoChargeItem.createMany({
        data: items.map(item => ({ ...item, transacaoId: reusable.id })),
      });
      id = reusable.id;
    } else {
      const created = await tx.transacaoFinanceira.upsert({
        where: { billingKey },
        create: {
          billingKey,
          descricao: description,
          valor: total,
          tipo: "RECEITA",
          categoria: "ALUGUEL",
          status: "PENDENTE",
          dataVencimento: vigencia.dataVencimento,
          leaseId: lease.id,
          imovelId: lease.propertyId,
          metadata: metadata as Prisma.InputJsonValue,
          itensCobranca: { create: items },
        },
        update: {},
        select: { id: true },
      });
      id = created.id;
    }
    if (duplicateIds.length) {
      await tx.transacaoFinanceira.deleteMany({ where: { id: { in: duplicateIds } } });
    }
    return id;
  });

  return {
    success: true,
    created: !reusable,
    transactionId,
    competence,
    dueDate: vigencia.dataVencimento.toISOString(),
    message: reusable
      ? "A cobrança pendente desta competência foi atualizada."
      : "Cobrança criada com sucesso.",
  };
}

async function gerarCobrancaLegada(
  contractId: string,
  tenantId: string,
  competence: string,
): Promise<ContractChargeResult> {
  const canonical = await prisma.lease.findFirst({
    where: { tenantId, legacyCode: contractId },
    select: { id: true },
  });
  if (canonical) return gerarCobrancaCanonica(canonical.id, tenantId, competence);

  const contract = await prisma.contratoImovelLocacao.findFirst({
    where: { id: contractId, imobId: tenantId },
    include: {
      locatarios: true,
      imovel: { include: { residencial: { include: { despesas: true } } } },
      imovelLocacao: { include: { periodos: { orderBy: { dataInicio: "asc" } } } },
    },
  });
  if (!contract) return { success: false, error: "Contrato não encontrado." };

  const tenant = contract.locatarios[0] ?? null;
  const legacyAddress = parseLegacyAddress(tenant?.endereco);
  const issues = listarPendenciasInter({
    tenant: tenant ? {
      nome: tenant.nome,
      cpfCnpj: tenant.cpfCnpj,
      address: legacyAddress ? {
        cep: legacyAddress.cep as string | number | null,
        logradouro: legacyAddress.logradouro as string | null,
        bairro: legacyAddress.bairro as string | null,
        municipio: (legacyAddress.municipio ?? legacyAddress.cidade) as string | null,
        estado: (legacyAddress.estado ?? legacyAddress.uf) as string | null,
      } : null,
    } : null,
    property: contract.imovel,
  });
  const rental = contract.imovelLocacao;
  if (!rental) issues.push(issue("LEGACY_RENTAL_REQUIRED", "Preencha o controle locatício do contrato."));
  if (issues.length) {
    return { success: false, error: "Existem dados obrigatórios pendentes.", issues };
  }

  const reference = calcularInicioCompetencia(competence);
  const referenceEnd = new Date(Date.UTC(
    reference.getUTCFullYear(),
    reference.getUTCMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  ));
  if (referenceEnd < rental!.dataInicio || reference > rental!.dataFim) {
    return {
      success: false,
      error: "A competência escolhida está fora da vigência do contrato.",
      issues: [issue("COMPETENCE_OUTSIDE_LEASE", "Escolha uma competência dentro da vigência contratual.")],
    };
  }
  const period = rental!.periodos.find(item => (
    reference >= item.dataInicio && reference <= item.dataFim
  ));
  const dueDay = period?.diaVencimento ?? rental!.diaVencimento;
  if (!dueDay) {
    return {
      success: false,
      error: "O vencimento não está configurado.",
      issues: [issue("DUE_DAY_REQUIRED", "Informe o dia de vencimento no controle locatício.")],
    };
  }
  const [year, month] = competence.split("-").map(Number);
  const dueDate = criarDataVencimento(year, month, dueDay);
  const rateioAluguel = rental!.periodos.length > 0
    ? calcularAluguelProporcionalCompetencia(
        rental!.periodos.map(item => ({
          id: item.id,
          effectiveFrom: item.dataInicio,
          effectiveTo: adicionarDiasUTC(item.dataFim, 1),
          rentAmount: item.valorAluguel,
        })),
        competence,
      )
    : null;
  if (rental!.periodos.length > 0 && !rateioAluguel) {
    return {
      success: false,
      error: "A competência possui uma lacuna entre vigências do aluguel.",
      issues: [issue("PERIOD_GAP", `Revise os períodos contratuais da competência ${competence}.`)],
    };
  }
  const rentValue = rateioAluguel?.valor
    ?? Number(period?.valorAluguel ?? rental!.valorAluguel ?? 0);
  const condominiumValue = period?.hasCondominio ? Number(period.valorCondominio ?? 0) : 0;
  const iptuValue = period?.hasIPTU ? Number(period.valorIPTU ?? 0) : 0;
  const residentialExpenses = resolverDespesasResidencial(
    contract.imovel.residencial?.despesas,
    dueDate,
    0,
  );
  const total = Number((rentValue + condominiumValue + iptuValue
    + residentialExpenses.gasValue + residentialExpenses.additionalTotal).toFixed(2));
  if (total <= 0) {
    return {
      success: false,
      error: "O valor calculado para a cobrança é inválido.",
      issues: [issue("CHARGE_AMOUNT_INVALID", `Confira os valores do período contratual da competência ${competence}.`)],
    };
  }
  const metadata = {
    competence,
    rentValue,
    rentProration: rateioAluguel?.rateado ? {
      startDate: rateioAluguel.inicio.toISOString(),
      endDate: rateioAluguel.fim.toISOString(),
      totalDays: rateioAluguel.diasTotais,
      portions: rateioAluguel.parcelas,
    } : null,
    condominiumValue,
    iptuValue,
    waterValue: 0,
    electricityValue: 0,
    gasValue: residentialExpenses.gasValue,
    residentialExpenses: residentialExpenses.residentialExpenses,
    dueDay,
    periodId: period?.id ?? null,
    billingConditions: {
      discountValue: Number(period?.descontoPontualidade ?? rental!.descontoPontualidade ?? 0),
      discountType: period?.tipoDesconto ?? rental!.tipoDesconto ?? "VALOR",
      discountDaysBefore: period?.diasAntecedenciaDesc ?? rental!.diasAntecedenciaDesc ?? 0,
      lateFeePercentage: Number(period?.multaAtrasoPercentual ?? rental!.multaAtrasoPercentual ?? 0),
      lateInterestMonthly: Number(period?.jurosAtrasoPercentual ?? rental!.jurosAtrasoPercentual ?? 0),
    },
    source: "PERIODO_CONTRATUAL",
  };
  const items = criarItensCobranca({
    rentValue,
    condominiumValue,
    iptuValue,
    waterValue: 0,
    electricityValue: 0,
    gasValue: residentialExpenses.gasValue,
    residentialExpenses: residentialExpenses.residentialExpenses,
  }, metadata.billingConditions);
  const existing = await prisma.transacaoFinanceira.findMany({
    where: { contratoId: contract.id, categoria: "ALUGUEL", tipo: "RECEITA" },
    orderBy: { createdAt: "desc" },
  });
  const sameCompetence = existing.filter(transaction => obterCompetenciaEfetiva(transaction) === competence);
  const registered = sameCompetence.find(transaction => !cobrancaEhRascunhoReutilizavel(transaction));
  if (registered) {
    return {
      success: true,
      created: false,
      transactionId: registered.id,
      competence,
      dueDate: registered.dataVencimento.toISOString(),
      message: "A cobrança desta competência já existe e foi preservada.",
    };
  }

  const description = `Aluguel - ${tenant!.nome} - Competência ${String(month).padStart(2, "0")}/${year}`;
  const billingKey = criarChaveCobrancaMensal({ contratoId: contract.id }, competence);
  const reusable = sameCompetence[0] ?? null;
  const duplicateIds = sameCompetence.slice(1).map(transaction => transaction.id);
  const transactionId = await prisma.$transaction(async tx => {
    let id: string;
    if (reusable) {
      await tx.transacaoFinanceira.update({
        where: { id: reusable.id },
        data: {
          billingKey,
          descricao: description,
          valor: total,
          dataVencimento: dueDate,
          contratoId: contract.id,
          imovelId: contract.imovelId,
          metadata: metadata as Prisma.InputJsonValue,
        },
      });
      await tx.boletoChargeItem.deleteMany({ where: { transacaoId: reusable.id } });
      await tx.boletoChargeItem.createMany({
        data: items.map(item => ({ ...item, transacaoId: reusable.id })),
      });
      id = reusable.id;
    } else {
      const created = await tx.transacaoFinanceira.upsert({
        where: { billingKey },
        create: {
          billingKey,
          descricao: description,
          valor: total,
          tipo: "RECEITA",
          categoria: "ALUGUEL",
          status: "PENDENTE",
          dataVencimento: dueDate,
          contratoId: contract.id,
          imovelId: contract.imovelId,
          metadata: metadata as Prisma.InputJsonValue,
          itensCobranca: { create: items },
        },
        update: {},
        select: { id: true },
      });
      id = created.id;
    }
    if (duplicateIds.length) {
      await tx.transacaoFinanceira.deleteMany({ where: { id: { in: duplicateIds } } });
    }
    return id;
  });

  return {
    success: true,
    created: !reusable,
    transactionId,
    competence,
    dueDate: dueDate.toISOString(),
    message: reusable
      ? "A cobrança pendente desta competência foi atualizada."
      : "Cobrança criada com sucesso.",
  };
}

export async function criarCobrancaContratoAction(
  reference: ContractChargeReference,
  competence: string,
): Promise<ContractChargeResult> {
  try {
    const inputError = validarEntrada(reference, competence);
    if (inputError) return { success: false, error: inputError };
    const { tenantId } = await requireUserContext();
    const result = reference.kind === "LEASE"
      ? await gerarCobrancaCanonica(reference.id, tenantId, competence)
      : await gerarCobrancaLegada(reference.id, tenantId, competence);

    if (result.success) {
      revalidatePath(`/locacao/view-locacao/${reference.id}`);
      revalidatePath("/cobrancas");
      revalidatePath("/financeiro");
    }
    return result;
  } catch (error) {
    console.error("[criar-cobranca-contrato] Erro:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Não foi possível criar a cobrança.",
    };
  }
}
