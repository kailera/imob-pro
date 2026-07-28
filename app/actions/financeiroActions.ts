"use server";

import { prisma } from "@/lib/prisma";
import { criarEstadoParaNovaEmissaoInter } from "@/lib/inter-cobranca";
import { revalidatePath } from "next/cache";
import { CategoriaTransacao, StatusTransacao, TipoTransacao } from "@/generated/prisma";
import { createPendingRepasseForRent } from "@/lib/financeiro/repasse";
import {
  calcularCompetenciaPorVencimento,
  calcularVencimentoMensal,
  criarDataVencimento,
} from "@/lib/locacao/financeiro";
import { sincronizarCobrancasPendentesDoPeriodo } from "@/lib/locacao/sincronizarCobrancas";
import { calcularIptuDaCobranca } from "@/lib/locacao/iptu";
import { calcularCondominioDaCobranca } from "@/lib/locacao/condominio";

export async function gerarCobrançasMensaisAction(mes: number, ano: number) {
  try {
    const competence = `${ano}-${String(mes).padStart(2, '0')}`;

    // 1. Buscar contratos de locação ativos
    const contratos = await prisma.contratoImovelLocacao.findMany({
      include: {
        imovelLocacao: {
          include: {
            locadors: true,
            periodos: { orderBy: { dataInicio: "asc" } },
          },
        },
        locatarios: true,
        imovel: true,
      },
    });

    let geradosCount = 0;
    let atualizadosCount = 0;
    const errors: string[] = [];

    // 2. Iterar por cada contrato para gerar a cobrança
    for (const contrato of contratos) {
      if (!contrato.imovelLocacao) continue;

      try {
        // Verificar se já existe cobrança de aluguel para esse contrato nessa competência
        const locacao = contrato.imovelLocacao;
        
        // Encontrar período vigente se houver sub-períodos cadastrados
        const targetDate = new Date(Date.UTC(ano, mes - 1, 15));
        const periodoAtivo = locacao.periodos.find((p) => {
          const start = new Date(p.dataInicio);
          const end = new Date(p.dataFim);
          return targetDate >= start && targetDate <= end;
        });

        const valorAluguel = periodoAtivo ? periodoAtivo.valorAluguel : (locacao.valorAluguel || 0);
        const hasCondominio = periodoAtivo ? periodoAtivo.hasCondominio : locacao.hasCondominio;
        const valorCondominio = periodoAtivo ? (periodoAtivo.valorCondominio || 0) : 0;
        const hasIPTU = periodoAtivo ? periodoAtivo.hasIPTU : locacao.hasIPTU;
        const valorIPTU = periodoAtivo ? (periodoAtivo.valorIPTU || 0) : 0;
        
        // Valor total da cobrança (Aluguel + encargos adicionais)
        const valorTotal = valorAluguel + (hasCondominio ? valorCondominio : 0) + (hasIPTU ? valorIPTU : 0);

        const cobrancasExistentes = await prisma.transacaoFinanceira.findMany({
          where: {
            contratoId: contrato.id,
            categoria: "ALUGUEL",
            tipo: "RECEITA",
          },
        });
        const cobrancaDaCompetencia = cobrancasExistentes.find((tx) => {
          const meta = tx.metadata as Record<string, unknown> | null;
          return meta?.competence === competence;
        });
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

        const metadata = {
          competence,
          rentValue: valorAluguel,
          condominiumValue: hasCondominio ? valorCondominio : 0,
          iptuValue: hasIPTU ? valorIPTU : 0,
          dueDay: diaVencimento,
          periodId: periodoAtivo?.id ?? null,
        };

        if (cobrancaDaCompetencia) {
          if (periodoAtivo) {
            const sincronizacao = await prisma.$transaction((tx) =>
              sincronizarCobrancasPendentesDoPeriodo(tx, {
                contratoIds: [contrato.id],
                periodo: {
                  ...periodoAtivo,
                  diaVencimento,
                },
              }),
            );
            atualizadosCount += sincronizacao.atualizadas;
          }
          continue;
        }

        await prisma.transacaoFinanceira.create({
          data: {
            descricao: `Aluguel - ${inquilinoNome} - Competência ${String(mes).padStart(2, '0')}/${ano}`,
            valor: valorTotal,
            tipo: "RECEITA",
            categoria: "ALUGUEL",
            status: "PENDENTE",
            dataVencimento,
            contratoId: contrato.id,
            imovelId: contrato.imovelId,
            metadata: metadata as any,
          },
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
        status: "ACTIVE",
        startDate: { lte: new Date(Date.UTC(ano, mes, 0, 23, 59, 59)) },
        endDate: { gte: new Date(Date.UTC(ano, mes - 2, 1)) },
      },
      include: {
        property: true,
        iptu: true,
        condominium: true,
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
        const dataVencimento = calcularVencimentoMensal(
          ano,
          mes,
          lease.terms?.paymentDueDay ?? lease.termsPeriods[0].paymentDueDay,
          primeiroVencimento,
        );
        if (!dataVencimento) continue;
        if (lease.billingStartDate && dataVencimento < lease.billingStartDate) continue;

        const leaseCompetence = calcularCompetenciaPorVencimento(
          dataVencimento,
          lease.terms?.firstPeriodEndDay,
        );
        const [competenceYear, competenceMonth] = leaseCompetence.split("-").map(Number);
        const referenceDate = new Date(Date.UTC(competenceYear, competenceMonth - 1, 15));
        const periodoAtivo = lease.termsPeriods.find(periodo =>
          referenceDate >= periodo.effectiveFrom
          && (!periodo.effectiveTo || referenceDate < periodo.effectiveTo),
        );
        if (!periodoAtivo) {
          throw new Error(`A competência ${leaseCompetence} não está coberta por um período locatício.`);
        }

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
          select: { id: true },
        });
        if (existingCharge) continue;

        const tenantName = lease.parties[0]?.person.name || "Inquilino";
        const rentAmount = Number(periodoAtivo.rentAmount);
        const iptu = calcularIptuDaCobranca(lease.iptu, dataVencimento, {
          legacySystem: lease.legacySystem,
        });
        const condominiumValue = calcularCondominioDaCobranca(lease.condominium);
        const totalAmount = Number((rentAmount + condominiumValue + iptu.valor).toFixed(2));
        const metadata = {
          competence: leaseCompetence,
          leaseId: lease.id,
          termsPeriodId: periodoAtivo.id,
          rentValue: rentAmount,
          condominiumValue,
          iptuValue: iptu.valor,
          iptuInstallment: iptu.numeroParcela,
          iptuInstallments: iptu.quantidadeParcelas,
          dueDay: periodoAtivo.paymentDueDay,
          source: "LEASE_TERMS_PERIOD",
        };

        await prisma.$transaction(async tx => {
          await tx.leaseCharge.create({
            data: {
              leaseId: lease.id,
              termsPeriodId: periodoAtivo.id,
              competence: leaseCompetence,
              description: `Aluguel - ${tenantName} - Competência ${String(competenceMonth).padStart(2, "0")}/${competenceYear}`,
              chargeType: "RENT",
              amount: totalAmount,
              calculationData: metadata,
              dueDate: dataVencimento,
            },
          });

          await tx.transacaoFinanceira.create({
            data: {
              descricao: `Aluguel - ${tenantName} - Competência ${String(competenceMonth).padStart(2, "0")}/${competenceYear}`,
              valor: totalAmount,
              tipo: "RECEITA",
              categoria: "ALUGUEL",
              status: "PENDENTE",
              dataVencimento,
              leaseId: lease.id,
              imovelId: lease.propertyId,
              metadata,
            },
          });
        });

        geradosCount++;
      } catch (err: any) {
        console.error(`Erro ao processar novo contrato ${lease.code}:`, err);
        errors.push(`Contrato ${lease.code}: ${err.message}`);
      }
    }

    revalidatePath("/cobrancas");
    revalidatePath("/financeiro");

    return { success: true, geradosCount, atualizadosCount, errors };
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
