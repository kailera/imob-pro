"use server";

import { prisma } from "@/lib/prisma";
import { requireUserContext } from "@/lib/auth";
import { criarEstadoParaNovaEmissaoInter } from "@/lib/inter-cobranca";
import { revalidatePath } from "next/cache";
import { createPendingRepasseForRent } from "@/lib/financeiro/repasse";
import {
  calcularAluguelProporcionalCompetencia,
  calcularInicioCompetencia,
  criarDataVencimento,
  resolverVigenciaCobrancaMensal,
} from "@/lib/locacao/financeiro";
import { adicionarDiasUTC } from "@/lib/locacao/periodos";
import { calcularIptuDaCobranca } from "@/lib/locacao/iptu";
import { calcularCondominioDaCobranca } from "@/lib/locacao/condominio";
import {
  cobrancaEhRascunhoReutilizavel,
  criarChaveCobrancaMensal,
  filtrarRascunhosReutilizaveisDaCompetencia,
  obterCompetenciaDaCobranca,
} from "@/lib/financeiro/cobranca-rascunho";
import { criarItensCobranca } from "@/lib/financeiro/boleto-composicao";
import { sincronizarPeriodoInicialLease } from "@/lib/locacao/sincronizarPeriodoInicialLease";
import { resolverDespesasResidencial } from "@/lib/residenciais/cobranca";
import {
  findCompleteLeaseForLegacyContract,
  removeLegacyDuplicatesWithCompleteLease,
} from "@/lib/locacao/contract-deduplication";
import { removerRascunhosFuturosDeContratoInativo } from "@/lib/locacao/cobrancas-inativos";

export async function gerarCobrançasMensaisAction(mes: number, ano: number) {
  try {
    const { tenantId } = await requireUserContext();
    const competence = `${ano}-${String(mes).padStart(2, '0')}`;
    const inicioMes = new Date(Date.UTC(ano, mes - 1, 1));
    const fimMes = new Date(Date.UTC(ano, mes, 0, 23, 59, 59, 999));

    // Repara contratos que já haviam sido inativados antes de a limpeza de
    // cobranças futuras existir. Boletos emitidos e competências atuais/vencidas
    // são preservados pela própria função de limpeza.
    await prisma.$transaction(async tx => {
      const inactiveLeases = await tx.lease.findMany({
        where: {
          tenantId,
          status: { in: ["SUSPENDED", "TERMINATED", "CANCELLED"] },
        },
        select: { id: true },
      });
      for (const inactiveLease of inactiveLeases) {
        await removerRascunhosFuturosDeContratoInativo(tx, inactiveLease.id);
      }
    });

    // A lista de origens só pode ser decidida depois que contratos atuais sem
    // período inicial forem reparados. Isso evita gerar pelo legado e pelo
    // canônico na mesma execução.
    const leasesSemPeriodo = await prisma.lease.findMany({
      where: {
        tenantId,
        status: "ACTIVE",
        termsPeriods: { none: {} },
      },
      select: { id: true },
    });
    for (const lease of leasesSemPeriodo) {
      await sincronizarPeriodoInicialLease(lease.id);
    }

    // 1. Buscar contratos de locação ativos
    const [contratosLegados, leasesCanonicos] = await Promise.all([
      prisma.contratoImovelLocacao.findMany({
        where: {
          imobId: tenantId,
          imovelLocacao: {
            is: {
              dataInicio: { lte: fimMes },
              dataFim: { gte: inicioMes },
            },
          },
        },
        include: {
          imovelLocacao: {
            include: {
              locadors: true,
              periodos: { orderBy: { dataInicio: "asc" } },
            },
          },
          locatarios: true,
          imovel: { include: { residencial: { include: { despesas: true } } } },
        },
      }),
      prisma.lease.findMany({
        where: { tenantId },
        select: {
          id: true,
          code: true,
          legacyCode: true,
          propertyId: true,
          status: true,
          termsPeriods: { select: { reviewStatus: true } },
          parties: {
            where: { role: "TENANT" },
            select: { role: true, person: { select: { cpfCnpj: true } } },
          },
        },
      }),
    ]);
    // Contratos migrados são cobrados exclusivamente pelo modelo canônico.
    // Isso também impede que o registro legado volte a cobrar após inativação.
    const contratos = removeLegacyDuplicatesWithCompleteLease(
      contratosLegados,
      leasesCanonicos,
    );

    let geradosCount = 0;
    let atualizadosCount = 0;
    let removidosCount = 0;
    const errors: string[] = [];

    // 2. Iterar por cada contrato para gerar a cobrança
    for (const contrato of contratos) {
      if (!contrato.imovelLocacao) continue;

      try {
        // Verificar se já existe cobrança de aluguel para esse contrato nessa competência
        const locacao = contrato.imovelLocacao;
        const billingKey = criarChaveCobrancaMensal(
          { contratoId: contrato.id },
          competence,
        );
        
        // Encontrar período vigente se houver sub-períodos cadastrados
        const targetDate = calcularInicioCompetencia(competence);
        const periodoAtivo = locacao.periodos.find((p) => {
          const start = new Date(p.dataInicio);
          const end = new Date(p.dataFim);
          return targetDate >= start && targetDate <= end;
        });

        const rateioAluguel = locacao.periodos.length > 0
          ? calcularAluguelProporcionalCompetencia(
              locacao.periodos.map(periodo => ({
                id: periodo.id,
                effectiveFrom: periodo.dataInicio,
                effectiveTo: adicionarDiasUTC(periodo.dataFim, 1),
                rentAmount: periodo.valorAluguel,
              })),
              competence,
            )
          : null;
        if (locacao.periodos.length > 0 && !rateioAluguel) {
          throw new Error(`A competência ${competence} possui uma lacuna entre vigências do aluguel.`);
        }
        const valorAluguel = rateioAluguel?.valor
          ?? (periodoAtivo ? periodoAtivo.valorAluguel : (locacao.valorAluguel || 0));
        const hasCondominio = periodoAtivo ? periodoAtivo.hasCondominio : locacao.hasCondominio;
        const valorCondominio = periodoAtivo ? (periodoAtivo.valorCondominio || 0) : 0;
        const hasIPTU = periodoAtivo ? periodoAtivo.hasIPTU : locacao.hasIPTU;
        const valorIPTU = periodoAtivo ? (periodoAtivo.valorIPTU || 0) : 0;
        
        // Valor total da cobrança (Aluguel + encargos adicionais)
        const cobrancasExistentes = await prisma.transacaoFinanceira.findMany({
          where: {
            contratoId: contrato.id,
            categoria: "ALUGUEL",
            tipo: "RECEITA",
          },
          orderBy: { createdAt: "desc" },
        });
        const cobrancaDaCompetencia = cobrancasExistentes.find(
          tx => obterCompetenciaDaCobranca(tx.metadata) === competence,
        );
        const metadataExistente = cobrancaDaCompetencia?.metadata as Record<string, unknown> | null;
        const diaVencimentoExistente = Number(metadataExistente?.dueDay)
          || cobrancaDaCompetencia?.dataVencimento.getUTCDate()
          || null;
        const inquilinoNome = contrato.locatarios[0]?.nome || "Inquilino";
        const diaVencimento = periodoAtivo?.diaVencimento
          ?? locacao.diaVencimento
          ?? diaVencimentoExistente;
        if (!diaVencimento) {
          throw new Error("Dia de vencimento não configurado. Edite o controle locatício antes de gerar a cobrança.");
        }
        const dataVencimento = criarDataVencimento(ano, mes, diaVencimento);
        const despesasResidencial = resolverDespesasResidencial(
          contrato.imovel.residencial?.despesas,
          dataVencimento,
          0,
        );
        const valorTotal = valorAluguel
          + (hasCondominio ? valorCondominio : 0)
          + (hasIPTU ? valorIPTU : 0)
          + despesasResidencial.gasValue
          + despesasResidencial.additionalTotal;

        const metadata = {
          competence,
          rentValue: valorAluguel,
          rentProration: rateioAluguel?.rateado ? {
            startDate: rateioAluguel.inicio.toISOString(),
            endDate: rateioAluguel.fim.toISOString(),
            totalDays: rateioAluguel.diasTotais,
            portions: rateioAluguel.parcelas,
          } : null,
          condominiumValue: hasCondominio ? valorCondominio : 0,
          iptuValue: hasIPTU ? valorIPTU : 0,
          waterValue: 0,
          electricityValue: 0,
          gasValue: despesasResidencial.gasValue,
          residentialExpenses: despesasResidencial.residentialExpenses,
          dueDay: diaVencimento,
          periodId: periodoAtivo?.id ?? null,
          billingConditions: {
            discountValue: Number(
              periodoAtivo?.descontoPontualidade
              ?? locacao.descontoPontualidade
              ?? 0
            ),
            discountType: periodoAtivo?.tipoDesconto
              ?? locacao.tipoDesconto
              ?? "VALOR",
            discountDaysBefore: periodoAtivo?.diasAntecedenciaDesc
              ?? locacao.diasAntecedenciaDesc
              ?? 0,
            lateFeePercentage: Number(
              periodoAtivo?.multaAtrasoPercentual
              ?? locacao.multaAtrasoPercentual
              ?? 0
            ),
            lateInterestMonthly: Number(
              periodoAtivo?.jurosAtrasoPercentual
              ?? locacao.jurosAtrasoPercentual
              ?? 0
            ),
          },
        };
        const itensCobranca = criarItensCobranca({
          rentValue: metadata.rentValue,
          condominiumValue: metadata.condominiumValue,
          iptuValue: metadata.iptuValue,
          waterValue: metadata.waterValue,
          electricityValue: metadata.electricityValue,
          gasValue: metadata.gasValue,
          residentialExpenses: metadata.residentialExpenses,
        }, metadata.billingConditions);

        if (
          cobrancaDaCompetencia
          && !cobrancaEhRascunhoReutilizavel(cobrancaDaCompetencia)
        ) {
          continue;
        }

        const rascunhos = filtrarRascunhosReutilizaveisDaCompetencia(
          cobrancasExistentes,
          competence,
        );
        const rascunhoPrincipal = cobrancaDaCompetencia ?? rascunhos[0] ?? null;
        if (rascunhoPrincipal) {
          const idsExcedentes = rascunhos
            .filter(item => item.id !== rascunhoPrincipal.id)
            .map(item => item.id);
          await prisma.$transaction(async tx => {
            await tx.transacaoFinanceira.update({
              where: { id: rascunhoPrincipal.id },
              data: {
                billingKey,
                descricao: `Aluguel - ${inquilinoNome} - Competência ${String(mes).padStart(2, '0')}/${ano}`,
                valor: valorTotal,
                dataVencimento,
                contratoId: contrato.id,
                imovelId: contrato.imovelId,
                metadata,
              },
            });
            await tx.boletoChargeItem.deleteMany({
              where: { transacaoId: rascunhoPrincipal.id },
            });
            await tx.boletoChargeItem.createMany({
              data: itensCobranca.map(item => ({
                transacaoId: rascunhoPrincipal.id,
                type: item.type,
                description: item.description,
                amount: item.amount,
                order: item.order,
              })),
            });
            if (idsExcedentes.length > 0) {
              await tx.transacaoFinanceira.deleteMany({
                where: { id: { in: idsExcedentes } },
              });
            }
          });
          atualizadosCount++;
          removidosCount += idsExcedentes.length;
          continue;
        }

        await prisma.transacaoFinanceira.upsert({
          where: { billingKey },
          create: {
            billingKey,
            descricao: `Aluguel - ${inquilinoNome} - Competência ${String(mes).padStart(2, '0')}/${ano}`,
            valor: valorTotal,
            tipo: "RECEITA",
            categoria: "ALUGUEL",
            status: "PENDENTE",
            dataVencimento,
            contratoId: contrato.id,
            imovelId: contrato.imovelId,
            metadata: metadata as any,
            itensCobranca: {
              create: itensCobranca,
            },
          },
          update: {},
        });

        geradosCount++;
      } catch (err: any) {
        console.error(`Erro ao processar contrato ${contrato.id}:`, err);
        errors.push(`Contrato ${contrato.id}: ${err.message}`);
      }
    }

    // 3. Contratos cadastrados no novo fluxo de locação.
    const leases = await prisma.lease.findMany({
      where: {
        tenantId,
        status: "ACTIVE",
        startDate: { lte: new Date(Date.UTC(ano, mes, 0, 23, 59, 59)) },
        endDate: { gte: inicioMes },
      },
      include: {
        property: { include: { residencial: { include: { despesas: true } } } },
        iptu: true,
        condominium: true,
        utilities: true,
        terms: true,
        termsPeriods: { orderBy: { createdAt: "desc" } },
        parties: {
          where: { role: "TENANT" },
          include: { person: true },
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        },
      },
    });

    for (const lease of leases) {
      try {
        if (lease.termsPeriods.length === 0) {
          throw new Error("Nenhum período locatício válido foi cadastrado.");
        }

        const primeiroVencimento = lease.terms?.firstPeriodDueDate ?? null;
        const vigencia = resolverVigenciaCobrancaMensal({
          periodos: lease.termsPeriods,
          ano,
          mes,
          diaVencimentoPadrao: lease.terms?.paymentDueDay
            ?? lease.termsPeriods[0].paymentDueDay,
          primeiroVencimento,
          fimPeriodo: lease.terms?.firstPeriodEndDay,
        });
        if (!vigencia) continue;
        const { dataVencimento, competencia: leaseCompetence, periodo: periodoAtivo } = vigencia;
        if (lease.billingStartDate && dataVencimento < lease.billingStartDate) continue;
        if (!periodoAtivo) {
          throw new Error(`A competência ${leaseCompetence} não está coberta por um período locatício.`);
        }
        const [competenceYear, competenceMonth] = leaseCompetence.split("-").map(Number);

        if (periodoAtivo.reviewStatus !== "REVIEWED") {
          throw new Error(`O período da competência ${leaseCompetence} ainda não foi conferido.`);
        }

        const existingCharge = await prisma.leaseCharge.findUnique({
          where: {
            leaseId_competence_chargeType: {
              leaseId: lease.id,
              competence: leaseCompetence,
              chargeType: "RENT",
            },
          },
          select: { id: true, status: true },
        });

        const tenantName = lease.parties[0]?.person.name || "Inquilino";
        const rateioAluguel = calcularAluguelProporcionalCompetencia(
          lease.termsPeriods.map(periodo => ({
            id: periodo.id,
            effectiveFrom: periodo.effectiveFrom,
            effectiveTo: periodo.effectiveTo,
            rentAmount: Number(periodo.rentAmount),
          })),
          leaseCompetence,
          lease.terms?.firstPeriodEndDay,
        );
        if (!rateioAluguel) {
          throw new Error(`A competência ${leaseCompetence} possui uma lacuna entre vigências do aluguel.`);
        }
        const rentAmount = rateioAluguel.valor;
        const iptu = calcularIptuDaCobranca(lease.iptu, dataVencimento, {
          legacySystem: lease.legacySystem,
        });
        const condominiumValue = calcularCondominioDaCobranca(lease.condominium);
        const waterValue = Number(
          lease.utilities.find(utility => utility.type === "WATER")?.amount ?? 0,
        );
        const electricityValue = Number(
          lease.utilities.find(utility => utility.type === "ELECTRICITY")?.amount ?? 0,
        );
        const leaseGasValue = Number(
          lease.utilities.find(utility => utility.type === "GAS")?.amount ?? 0,
        );
        const despesasResidencial = resolverDespesasResidencial(
          lease.property?.residencial?.despesas,
          dataVencimento,
          leaseGasValue,
        );
        const gasValue = despesasResidencial.gasValue;
        const totalAmount = Number((
          rentAmount
          + condominiumValue
          + iptu.valor
          + waterValue
          + electricityValue
          + gasValue
          + despesasResidencial.additionalTotal
        ).toFixed(2));
        const metadata = {
          competence: leaseCompetence,
          leaseId: lease.id,
          termsPeriodId: periodoAtivo.id,
          rentValue: rentAmount,
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
          residentialExpenses: despesasResidencial.residentialExpenses,
          residentialGasOverridden: despesasResidencial.gasOverridden,
          iptuInstallment: iptu.numeroParcela,
          iptuInstallments: iptu.quantidadeParcelas,
          billingConditions: {
            discountValue: Number(
              periodoAtivo.earlyPaymentDiscount
              ?? lease.terms?.earlyPaymentDiscount
              ?? 0
            ),
            discountType: periodoAtivo.discountType
              ?? lease.terms?.discountType
              ?? "FIXED",
            discountDaysBefore: periodoAtivo.discountDaysBefore
              ?? lease.terms?.discountDaysBefore
              ?? 0,
            lateFeePercentage: Number(
              periodoAtivo.lateFeePercentage
              ?? lease.terms?.lateFeePercentage
              ?? 0
            ),
            lateInterestMonthly: Number(
              periodoAtivo.lateInterestMonthly
              ?? lease.terms?.lateInterestMonthly
              ?? 0
            ),
          },
          dueDay: periodoAtivo.paymentDueDay,
          source: "LEASE_TERMS_PERIOD",
        };
        const itensCobranca = criarItensCobranca({
          rentValue: metadata.rentValue,
          condominiumValue: metadata.condominiumValue,
          iptuValue: metadata.iptuValue,
          waterValue: metadata.waterValue,
          electricityValue: metadata.electricityValue,
          gasValue: metadata.gasValue,
          residentialExpenses: metadata.residentialExpenses,
        }, metadata.billingConditions);

        const legacyContractIds = contratosLegados
          .filter(legacy => (
            findCompleteLeaseForLegacyContract(legacy, [lease])?.id === lease.id
          ))
          .map(legacy => legacy.id);
        const billingKey = criarChaveCobrancaMensal(
          { leaseId: lease.id },
          leaseCompetence,
        );
        const cobrancasExistentes = await prisma.transacaoFinanceira.findMany({
          where: {
            OR: [
              { leaseId: lease.id },
              { billingKey },
              ...(legacyContractIds.length > 0
                ? [{ contratoId: { in: legacyContractIds } }]
                : []),
            ],
            categoria: "ALUGUEL",
            tipo: "RECEITA",
          },
          orderBy: { createdAt: "desc" },
        });
        const cobrancaDaCompetencia = cobrancasExistentes.find(
          item => obterCompetenciaDaCobranca(item.metadata) === leaseCompetence,
        );
        if (
          cobrancaDaCompetencia
          && !cobrancaEhRascunhoReutilizavel(cobrancaDaCompetencia)
        ) {
          continue;
        }
        if (
          existingCharge
          && existingCharge.status !== "PENDING"
          && !cobrancaDaCompetencia
        ) {
          continue;
        }

        const rascunhos = filtrarRascunhosReutilizaveisDaCompetencia(
          cobrancasExistentes,
          leaseCompetence,
        );
        const rascunhoPrincipal = cobrancaDaCompetencia ?? rascunhos[0] ?? null;
        const idsExcedentes = rascunhos
          .filter(item => item.id !== rascunhoPrincipal?.id)
          .map(item => item.id);
        const persisted = await prisma.$transaction(async tx => {
          // O contrato pode ser inativado enquanto o lote está calculando. A
          // conferência dentro da transação impede a gravação nessa janela.
          const currentLease = await tx.lease.findUnique({
            where: { id: lease.id },
            select: { status: true, startDate: true, endDate: true },
          });
          if (
            currentLease?.status !== "ACTIVE"
            || (currentLease.startDate && currentLease.startDate > fimMes)
            || (currentLease.endDate && currentLease.endDate < inicioMes)
          ) return false;

          await tx.leaseCharge.upsert({
            where: {
              leaseId_competence_chargeType: {
                leaseId: lease.id,
                competence: leaseCompetence,
                chargeType: "RENT",
              },
            },
            create: {
              leaseId: lease.id,
              termsPeriodId: periodoAtivo.id,
              competence: leaseCompetence,
              description: `Aluguel - ${tenantName} - Competência ${String(competenceMonth).padStart(2, "0")}/${competenceYear}`,
              chargeType: "RENT",
              amount: totalAmount,
              calculationData: metadata,
              dueDate: dataVencimento,
            },
            update: {
              termsPeriodId: periodoAtivo.id,
              description: `Aluguel - ${tenantName} - Competência ${String(competenceMonth).padStart(2, "0")}/${competenceYear}`,
              amount: totalAmount,
              calculationData: metadata,
              dueDate: dataVencimento,
              status: "PENDING",
              paidDate: null,
            },
          });

          if (rascunhoPrincipal) {
            await tx.transacaoFinanceira.update({
              where: { id: rascunhoPrincipal.id },
              data: {
                billingKey,
                descricao: `Aluguel - ${tenantName} - Competência ${String(competenceMonth).padStart(2, "0")}/${competenceYear}`,
                valor: totalAmount,
                dataVencimento,
                leaseId: lease.id,
                contratoId: null,
                imovelId: lease.propertyId,
                metadata,
              },
            });
            await tx.boletoChargeItem.deleteMany({
              where: { transacaoId: rascunhoPrincipal.id },
            });
            await tx.boletoChargeItem.createMany({
              data: itensCobranca.map(item => ({
                transacaoId: rascunhoPrincipal.id,
                type: item.type,
                description: item.description,
                amount: item.amount,
                order: item.order,
              })),
            });
          } else {
            await tx.transacaoFinanceira.upsert({
              where: { billingKey },
              create: {
                billingKey,
                descricao: `Aluguel - ${tenantName} - Competência ${String(competenceMonth).padStart(2, "0")}/${competenceYear}`,
                valor: totalAmount,
                tipo: "RECEITA",
                categoria: "ALUGUEL",
                status: "PENDENTE",
                dataVencimento,
                leaseId: lease.id,
                imovelId: lease.propertyId,
                metadata,
                itensCobranca: {
                  create: itensCobranca,
                },
              },
              update: {},
            });
          }

          if (idsExcedentes.length > 0) {
            await tx.transacaoFinanceira.deleteMany({
              where: { id: { in: idsExcedentes } },
            });
          }
          return true;
        });

        if (!persisted) continue;

        if (rascunhoPrincipal) {
          atualizadosCount++;
          removidosCount += idsExcedentes.length;
        } else {
          geradosCount++;
        }
      } catch (err: any) {
        console.error(`Erro ao processar novo contrato ${lease.code}:`, err);
        errors.push(`Contrato ${lease.code}: ${err.message}`);
      }
    }

    revalidatePath("/cobrancas");
    revalidatePath("/financeiro");

    return { success: true, geradosCount, atualizadosCount, removidosCount, errors };
  } catch (error: any) {
    console.error("Erro geral na geração de cobranças:", error);
    return { success: false, error: error.message || "Erro inesperado ao gerar cobranças." };
  }
}

// Retorna as despesas de manutenção de um imóvel que estão liquidadas em um determinado mês
export async function getDespesasManutencaoDisponiveis(imovelId: string, competence: string) {
  try {
    const [ano, mesStr] = competence.split("-");
    const mes = parseInt(mesStr);
    const startDate = new Date(parseInt(ano), mes - 1, 1);
    const endDate = new Date(parseInt(ano), mes, 0, 23, 59, 59);

    // Buscar despesas liquidadas de manutenção (CUSTO_OPERACIONAL ou OUTRO) no período
    const despesas = await prisma.transacaoFinanceira.findMany({
      where: {
        imovelId,
        tipo: "DESPESA",
        categoria: "CUSTO_OPERACIONAL",
        status: "LIQUIDADO",
        dataPagamento: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { dataPagamento: "desc" },
    });

    return { success: true, data: despesas };
  } catch (error: any) {
    console.error("Erro ao buscar despesas de manutenção:", error);
    return { success: false, error: error.message || "Erro ao buscar despesas." };
  }
}

// Atualizar valor e deductions do repasse
export async function atualizarRepasseAjustadoAction(
  repasseId: string,
  despesasDeducoesIds: string[],
  valorLiquido: number
) {
  try {
    const repasse = await prisma.transacaoFinanceira.findUnique({
      where: { id: repasseId },
    });

    if (!repasse) {
      return { success: false, error: "Transação de repasse não encontrada." };
    }

    const currentMeta = (repasse.metadata as any) || {};

    // Buscar as despesas para recalcular a soma e auditar
    const despesas = await prisma.transacaoFinanceira.findMany({
      where: {
        id: { in: despesasDeducoesIds },
      },
    });

    const totalManutencaoDeducoes = despesas.reduce((acc, curr) => acc + curr.valor, 0);

    const updatedMeta = {
      ...currentMeta,
      deductedMaintenanceIds: despesasDeducoesIds,
      deductedMaintenanceValue: totalManutencaoDeducoes,
    };

    await prisma.transacaoFinanceira.update({
      where: { id: repasseId },
      data: {
        valor: valorLiquido,
        metadata: updatedMeta as any,
      },
    });

    revalidatePath("/pagamentos");
    revalidatePath("/financeiro");
    revalidatePath("/financeiro/repasse");

    return { success: true };
  } catch (error: any) {
    console.error("Erro ao ajustar repasse:", error);
    return { success: false, error: error.message || "Erro ao atualizar repasse." };
  }
}

// Marcar repasse como liquidado
export async function liquidarRepasseAction(repasseId: string) {
  try {
    await prisma.transacaoFinanceira.update({
      where: { id: repasseId },
      data: {
        status: "LIQUIDADO",
        dataPagamento: new Date(),
      },
    });

    revalidatePath("/pagamentos");
    revalidatePath("/financeiro");
    revalidatePath("/financeiro/repasse");

    return { success: true };
  } catch (error: any) {
    console.error("Erro ao liquidar repasse:", error);
    return { success: false, error: error.message || "Erro ao liquidar repasse." };
  }
}

// Marcar cobrança como liquidada (paga)
export async function liquidarCobrancaAction(cobrancaId: string, dataPagamento: Date, valorPagamento: number) {
  try {
    await prisma.transacaoFinanceira.update({
      where: { id: cobrancaId },
      data: {
        status: "LIQUIDADO",
        dataPagamento: new Date(dataPagamento),
        valor: valorPagamento,
      },
    });

    // Tenta criar o repasse automático correspondente se for uma cobrança de aluguel
    try {
      await criarRepassePendente(cobrancaId);
    } catch (repasseErr) {
      console.error("Erro ao criar repasse automático após liquidação manual:", repasseErr);
    }

    revalidatePath("/cobrancas");
    revalidatePath("/financeiro");

    return { success: true };
  } catch (error: any) {
    console.error("Erro ao liquidar cobrança:", error);
    return { success: false, error: error.message || "Erro ao registrar pagamento." };
  }
}

// Cria automaticamente o repasse de locador correspondente a um aluguel liquidado
export async function criarRepassePendente(rentTransactionId: string) {
  try {
    const result = await prisma.$transaction((tx) =>
      createPendingRepasseForRent(tx, rentTransactionId),
    );
    if (result.created) {
      console.log(`[criarRepassePendente] Repasse pendente criado para o aluguel ${rentTransactionId}.`);
    }
    
    revalidatePath("/pagamentos");
    revalidatePath("/financeiro");
    revalidatePath("/financeiro/repasse");
  } catch (error) {
    console.error("[criarRepassePendente] Erro ao criar repasse automático:", error);
    throw error;
  }
}

/**
 * Renegocia uma cobrança pendente ou vencida.
 * Se já houver boleto do Inter gerado, realiza a baixa/cancelamento no banco primeiro.
 */
export async function renegociarCobrancaAction(
  cobrancaId: string,
  novoVencimentoStr: string,
  novoValor: number
) {
  try {
    const tx = await prisma.transacaoFinanceira.findUnique({
      where: { id: cobrancaId },
    });

    if (!tx) {
      return { success: false, error: "Cobrança não encontrada." };
    }

    if (tx.status === "LIQUIDADO") {
      return { success: false, error: "Não é possível renegociar uma cobrança que já foi paga." };
    }

    // Se possui boleto no Inter, realiza o cancelamento primeiro
    if (tx.interCodigoSolicitacao) {
      const { cancelarBolePixAction } = await import("@/lib/inter");
      const cancelRes = await cancelarBolePixAction(cobrancaId);
      if (!cancelRes.success) {
        return { success: false, error: `Falha ao cancelar o boleto anterior no Banco Inter: ${cancelRes.error}` };
      }
    }

    // Atualiza a transação local com a nova data, novo valor e limpa os campos de integração anteriores
    await prisma.transacaoFinanceira.update({
      where: { id: cobrancaId },
      data: {
        dataVencimento: new Date(novoVencimentoStr),
        valor: novoValor,
        ...criarEstadoParaNovaEmissaoInter(),
      },
    });

    revalidatePath("/cobrancas");
    revalidatePath("/financeiro");

    return { success: true };
  } catch (error: any) {
    console.error("Erro ao renegociar cobrança:", error);
    return { success: false, error: error.message || "Erro inesperado ao renegociar cobrança." };
  }
}
