"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { requireUserContext } from "@/lib/auth";
import {
  asMetadataRecord,
  atualizarMetadataComposicao,
  calcularDescontoEfetivo,
  calcularTotalNominal,
  criarItensCobranca,
  numeroSeguro,
  type BoletoChargeItemType,
  type BoletoCompositionInput,
  type BoletoBillingConditions,
} from "@/lib/financeiro/boleto-composicao";
import {
  criarDescontoInterV3,
  criarMensagemCobrancaInter,
  linhasMensagemInter,
  resolverBonificacaoLease,
} from "@/lib/inter-cobranca";
import { resolverPeriodoDaCobranca } from "@/lib/locacao/resolverPeriodoCobranca";

const transactionInclude = {
  lease: {
    include: {
      terms: true,
      termsPeriods: { orderBy: { createdAt: "desc" as const } },
      iptu: true,
      condominium: true,
      utilities: true,
    },
  },
  contrato: {
    include: {
      imovelLocacao: {
        include: {
          periodos: { orderBy: { dataInicio: "asc" as const } },
        },
      },
    },
  },
  itensCobranca: { orderBy: { order: "asc" as const } },
} satisfies Prisma.TransacaoFinanceiraInclude;

function podeEditarCobranca(transaction: {
  status: string;
  interNossoNumero: string | null;
  interCodigoSolicitacao: string | null;
  interTxId: string | null;
  interBarcode: string | null;
}) {
  return transaction.status === "PENDENTE"
    && !transaction.interNossoNumero
    && !transaction.interCodigoSolicitacao
    && !transaction.interTxId
    && !transaction.interBarcode;
}

function resolverPeriodoLease(
  transaction: Prisma.TransacaoFinanceiraGetPayload<{ include: typeof transactionInclude }>,
) {
  const metadata = asMetadataRecord(transaction.metadata);
  const periodId = typeof metadata.termsPeriodId === "string" ? metadata.termsPeriodId : null;
  if (periodId) {
    const registered = transaction.lease?.termsPeriods.find(period => period.id === periodId);
    if (registered) return registered;
  }

  return transaction.lease?.termsPeriods.find(period =>
    transaction.dataVencimento >= period.effectiveFrom
    && (!period.effectiveTo || transaction.dataVencimento < period.effectiveTo),
  ) ?? transaction.lease?.termsPeriods[0] ?? null;
}

function resolverCondicoes(
  transaction: Prisma.TransacaoFinanceiraGetPayload<{ include: typeof transactionInclude }>,
): BoletoBillingConditions {
  const metadata = asMetadataRecord(transaction.metadata);
  const snapshot = asMetadataRecord(metadata.billingConditions);
  if (Object.keys(snapshot).length) {
    return {
      discountValue: numeroSeguro(snapshot.discountValue),
      discountType: typeof snapshot.discountType === "string" ? snapshot.discountType : "FIXED",
      discountDaysBefore: Math.max(0, Math.trunc(numeroSeguro(snapshot.discountDaysBefore))),
      lateFeePercentage: numeroSeguro(snapshot.lateFeePercentage),
      lateInterestMonthly: numeroSeguro(snapshot.lateInterestMonthly),
    };
  }

  if (transaction.lease) {
    const period = resolverPeriodoLease(transaction);
    const bonus = resolverBonificacaoLease({
      valorPeriodo: period?.earlyPaymentDiscount,
      tipoPeriodo: period?.discountType,
      diasPeriodo: period?.discountDaysBefore,
      valorContrato: transaction.lease.terms?.earlyPaymentDiscount,
      tipoContrato: transaction.lease.terms?.discountType,
      diasContrato: transaction.lease.terms?.discountDaysBefore,
    });
    return {
      discountValue: bonus.valor,
      discountType: bonus.tipo ?? "FIXED",
      discountDaysBefore: bonus.diasAntesDoVencimento ?? 0,
      lateFeePercentage: numeroSeguro(
        period?.lateFeePercentage ?? transaction.lease.terms?.lateFeePercentage,
      ),
      lateInterestMonthly: numeroSeguro(
        period?.lateInterestMonthly ?? transaction.lease.terms?.lateInterestMonthly,
      ),
    };
  }

  const locacao = transaction.contrato?.imovelLocacao;
  const period = locacao
    ? resolverPeriodoDaCobranca(locacao.periodos, transaction.metadata, transaction.dataVencimento)
    : null;
  return {
    discountValue: numeroSeguro(period?.descontoPontualidade ?? locacao?.descontoPontualidade),
    discountType: period?.tipoDesconto ?? locacao?.tipoDesconto ?? "VALOR",
    discountDaysBefore: period?.diasAntecedenciaDesc ?? locacao?.diasAntecedenciaDesc ?? 0,
    lateFeePercentage: numeroSeguro(
      period?.multaAtrasoPercentual ?? locacao?.multaAtrasoPercentual,
    ),
    lateInterestMonthly: numeroSeguro(
      period?.jurosAtrasoPercentual ?? locacao?.jurosAtrasoPercentual,
    ),
  };
}

async function getAuthorizedTransaction(transactionId: string, tenantId: string) {
  const transaction = await prisma.transacaoFinanceira.findUnique({
    where: { id: transactionId },
    include: transactionInclude,
  });
  if (!transaction) throw new Error("Cobrança não encontrada.");

  const belongsToTenant = transaction.lease?.tenantId === tenantId
    || transaction.contrato?.imobId === tenantId;
  if (!belongsToTenant) throw new Error("Cobrança não encontrada.");
  return transaction;
}

export async function getBoletoCompositionAction(transactionId: string) {
  try {
    const context = await requireUserContext();
    const transaction = await getAuthorizedTransaction(transactionId, context.tenantId);
    const metadata = asMetadataRecord(transaction.metadata);
    const leasePeriod = resolverPeriodoLease(transaction);
    const legacyLocacao = transaction.contrato?.imovelLocacao;
    const legacyPeriod = legacyLocacao
      ? resolverPeriodoDaCobranca(
          legacyLocacao.periodos,
          transaction.metadata,
          transaction.dataVencimento,
        )
      : null;
    const utilityByType = (type: string) =>
      transaction.lease?.utilities.find(utility => utility.type === type);

    const rentValue = numeroSeguro(
      metadata.rentValue,
      numeroSeguro(leasePeriod?.rentAmount ?? legacyPeriod?.valorAluguel, transaction.valor),
    );
    const iptuValue = numeroSeguro(
      metadata.iptuValue,
      legacyPeriod?.hasIPTU ? numeroSeguro(legacyPeriod.valorIPTU) : 0,
    );
    const condominiumValue = numeroSeguro(
      metadata.condominiumValue,
      legacyPeriod?.hasCondominio ? numeroSeguro(legacyPeriod.valorCondominio) : 0,
    );
    const waterValue = numeroSeguro(metadata.waterValue, numeroSeguro(utilityByType("WATER")?.amount));
    const electricityValue = numeroSeguro(
      metadata.electricityValue,
      numeroSeguro(utilityByType("ELECTRICITY")?.amount),
    );
    const gasValue = numeroSeguro(metadata.gasValue, numeroSeguro(utilityByType("GAS")?.amount));
    const outrosPersistidos = transaction.itensCobranca.filter(item => item.type === "OTHER");
    const otherValue = outrosPersistidos.length > 0
      ? outrosPersistidos.reduce((total, item) => total + Number(item.amount), 0)
      : numeroSeguro(metadata.otherValue);
    const otherDescription = outrosPersistidos.length > 0
      ? outrosPersistidos.map(item => item.description).join(", ")
      : typeof metadata.otherDescription === "string"
        ? metadata.otherDescription
        : "";
    const conditions = resolverCondicoes(transaction);
    const nominalTotal = calcularTotalNominal({
      rentValue,
      iptuValue,
      condominiumValue,
      waterValue,
      electricityValue,
      gasValue,
      otherValue,
    });
    const effectiveDiscount = calcularDescontoEfetivo(
      rentValue,
      conditions.discountValue,
      conditions.discountType,
    );
    const registeredAtInter = Boolean(
      transaction.interNossoNumero || transaction.interCodigoSolicitacao,
    );
    const persistedMessage = linhasMensagemInter(transaction.interMensagem);
    const items = transaction.itensCobranca.length > 0
      ? transaction.itensCobranca.map(item => ({
          type: item.type as BoletoChargeItemType,
          description: item.description,
          amount: Number(item.amount),
          order: item.order,
        }))
      : criarItensCobranca({
          rentValue,
          iptuValue,
          condominiumValue,
          waterValue,
          electricityValue,
          gasValue,
          otherValue,
          otherDescription,
        }, conditions);
    const previewMessage = criarMensagemCobrancaInter({
      metadata,
      items,
      valorNominal: nominalTotal,
      dataVencimento: transaction.dataVencimento.toISOString().slice(0, 10),
      desconto: criarDescontoInterV3({
        valor: conditions.discountValue,
        tipo: conditions.discountType,
        diasAntesDoVencimento: conditions.discountDaysBefore,
      }),
      multaPercentual: conditions.lateFeePercentage,
      jurosMensal: conditions.lateInterestMonthly,
    });

    return {
      success: true as const,
      composition: {
        transactionId: transaction.id,
        description: transaction.descricao,
        dueDate: transaction.dataVencimento.toISOString(),
        status: transaction.status,
        contractCode: transaction.lease?.code ?? null,
        competence: typeof metadata.competence === "string" ? metadata.competence : null,
        contractEditUrl: transaction.lease
          ? `/locacao/contratos/${transaction.lease.id}/editar`
          : transaction.contrato
            ? `/locacao/view-locacao/${transaction.contrato.id}`
            : null,
        rentValue,
        iptuValue,
        condominiumValue,
        waterValue,
        electricityValue,
        gasValue,
        otherValue,
        otherDescription,
        ...conditions,
        nominalTotal,
        effectiveDiscount,
        totalWithDiscount: Number((nominalTotal - effectiveDiscount).toFixed(2)),
        iptuPaymentStartDate: transaction.lease?.iptu?.paymentStartDate
          ?.toISOString().slice(0, 10) ?? null,
        iptuInstallments: transaction.lease?.iptu?.installments ?? null,
        iptuInstallment: numeroSeguro(metadata.iptuInstallment) || null,
        iptuInstallmentsOnCharge: numeroSeguro(metadata.iptuInstallments) || null,
        canEdit: podeEditarCobranca(transaction),
        canUpdateContract: Boolean(transaction.lease || legacyPeriod),
        registeredAtInter,
        interMessage: registeredAtInter && persistedMessage.length > 0
          ? persistedMessage
          : linhasMensagemInter(previewMessage),
        interMessageSent: registeredAtInter && persistedMessage.length > 0,
      },
    };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Não foi possível carregar a composição.",
    };
  }
}

function validarInput(input: BoletoCompositionInput) {
  const monetaryValues = [
    input.rentValue,
    input.iptuValue,
    input.condominiumValue,
    input.waterValue,
    input.electricityValue,
    input.gasValue,
    input.otherValue ?? 0,
    input.discountValue,
    input.lateFeePercentage,
    input.lateInterestMonthly,
  ];
  if (monetaryValues.some(value => !Number.isFinite(value) || value < 0)) {
    throw new Error("Os valores da composição devem ser números maiores ou iguais a zero.");
  }
  if (input.rentValue <= 0) throw new Error("O aluguel deve ser maior que zero.");
  if (!["FIXED", "VALOR", "PERCENT", "PERCENTAGE", "PERCENTUAL"].includes(input.discountType)) {
    throw new Error("Tipo de desconto inválido.");
  }
  if (!Number.isInteger(input.discountDaysBefore) || input.discountDaysBefore < 0) {
    throw new Error("A antecedência do desconto deve ser um número inteiro positivo.");
  }
}

export async function updateBoletoCompositionAction(
  transactionId: string,
  input: BoletoCompositionInput,
) {
  try {
    validarInput(input);
    const context = await requireUserContext();
    const transaction = await getAuthorizedTransaction(transactionId, context.tenantId);
    if (!podeEditarCobranca(transaction)) {
      throw new Error(
        "Este boleto já foi registrado no Inter ou não está pendente. Cancele-o antes de editar.",
      );
    }

    const nominalTotal = calcularTotalNominal(input);
    const metadata = atualizarMetadataComposicao(transaction.metadata, input);
    const items = criarItensCobranca(input, input);
    let contractWarning: string | null = null;

    await prisma.$transaction(async tx => {
      await tx.transacaoFinanceira.update({
        where: { id: transaction.id },
        data: {
          valor: nominalTotal,
          metadata: metadata as Prisma.InputJsonValue,
        },
      });
      await tx.boletoChargeItem.deleteMany({
        where: { transacaoId: transaction.id },
      });
      if (items.length > 0) {
        await tx.boletoChargeItem.createMany({
          data: items.map(item => ({
            transacaoId: transaction.id,
            type: item.type,
            description: item.description,
            amount: item.amount,
            order: item.order,
          })),
        });
      }

      const currentMetadata = asMetadataRecord(transaction.metadata);
      const competence = typeof currentMetadata.competence === "string"
        ? currentMetadata.competence
        : null;
      if (transaction.leaseId && competence) {
        await tx.leaseCharge.updateMany({
          where: {
            leaseId: transaction.leaseId,
            competence,
            chargeType: "RENT",
            status: "PENDING",
          },
          data: {
            amount: nominalTotal,
            calculationData: metadata as Prisma.InputJsonValue,
          },
        });
      }

      if (!input.applyToContract) return;

      if (transaction.lease) {
        const period = resolverPeriodoLease(transaction);
        const termsData = {
          rentValue: input.rentValue,
          earlyPaymentDiscount: input.discountValue,
          discountType: input.discountType,
          discountDaysBefore: input.discountDaysBefore,
          lateFeePercentage: input.lateFeePercentage,
          lateInterestMonthly: input.lateInterestMonthly,
        };
        if (period) {
          await tx.leaseTermsPeriod.update({
            where: { id: period.id },
            data: {
              rentAmount: input.rentValue,
              earlyPaymentDiscount: input.discountValue,
              discountType: input.discountType,
              discountDaysBefore: input.discountDaysBefore,
              lateFeePercentage: input.lateFeePercentage,
              lateInterestMonthly: input.lateInterestMonthly,
            },
          });
        }
        if (transaction.lease.terms) {
          await tx.leaseTerms.update({
            where: { leaseId: transaction.lease.id },
            data: termsData,
          });
        }

        if (input.iptuValue > 0) {
          const paymentStartDate = input.iptuPaymentStartDate
            ? new Date(`${input.iptuPaymentStartDate}T00:00:00.000Z`)
            : transaction.lease.iptu?.paymentStartDate;
          const installments = input.iptuInstallments?.trim()
            || transaction.lease.iptu?.installments;
          if (!paymentStartDate || !installments || !/^\d+$/.test(installments)) {
            throw new Error(
              "Para atualizar o IPTU no contrato, informe a primeira competência e as parcelas.",
            );
          }
          await tx.leaseIptu.upsert({
            where: { leaseId: transaction.lease.id },
            create: {
              leaseId: transaction.lease.id,
              amount: input.iptuValue,
              paymentStartDate,
              installments,
              responsibleParty: "Locatário",
            },
            update: {
              amount: input.iptuValue,
              paymentStartDate,
              installments,
            },
          });
        } else if (transaction.lease.iptu) {
          await tx.leaseIptu.update({
            where: { leaseId: transaction.lease.id },
            data: { amount: null },
          });
        }

        await tx.leaseCondominium.upsert({
          where: { leaseId: transaction.lease.id },
          create: {
            leaseId: transaction.lease.id,
            amount: input.condominiumValue || null,
            responsibleParty: "Locatário",
          },
          update: { amount: input.condominiumValue || null },
        });

        for (const utility of [
          { type: "WATER", amount: input.waterValue },
          { type: "ELECTRICITY", amount: input.electricityValue },
          { type: "GAS", amount: input.gasValue },
        ]) {
          await tx.leaseUtility.upsert({
            where: {
              leaseId_type: {
                leaseId: transaction.lease.id,
                type: utility.type,
              },
            },
            create: {
              leaseId: transaction.lease.id,
              type: utility.type,
              amount: utility.amount || null,
            },
            update: { amount: utility.amount || null },
          });
        }
        return;
      }

      const locacao = transaction.contrato?.imovelLocacao;
      const period = locacao
        ? resolverPeriodoDaCobranca(
            locacao.periodos,
            transaction.metadata,
            transaction.dataVencimento,
          )
        : null;
      if (period) {
        await tx.periodoContratoLocacao.update({
          where: { id: period.id },
          data: {
            valorAluguel: input.rentValue,
            hasCondominio: input.condominiumValue > 0,
            valorCondominio: input.condominiumValue || null,
            hasIPTU: input.iptuValue > 0,
            valorIPTU: input.iptuValue || null,
            valorTotal: Number((
              input.rentValue + input.condominiumValue + input.iptuValue
            ).toFixed(2)),
            descontoPontualidade: input.discountValue,
            tipoDesconto: input.discountType,
            diasAntecedenciaDesc: input.discountDaysBefore,
            multaAtrasoPercentual: input.lateFeePercentage,
            jurosAtrasoPercentual: input.lateInterestMonthly,
          },
        });
        if (input.waterValue > 0 || input.electricityValue > 0 || input.gasValue > 0) {
          contractWarning = "Água, energia e gás foram alterados somente neste boleto legado.";
        }
      }
    });

    revalidatePath("/cobrancas");
    revalidatePath("/financeiro");
    if (transaction.leaseId) {
      revalidatePath(`/locacao/contratos/${transaction.leaseId}/editar`);
    }

    return {
      success: true as const,
      message: input.applyToContract
        ? "Composição atualizada neste boleto e no contrato."
        : "Composição atualizada somente neste boleto.",
      warning: contractWarning,
      nominalTotal,
    };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Não foi possível atualizar a composição.",
    };
  }
}
