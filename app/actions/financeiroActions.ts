"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { CategoriaTransacao, StatusTransacao, TipoTransacao } from "@/generated/prisma";

export async function gerarCobrançasMensaisAction(mes: number, ano: number) {
  try {
    const competence = `${ano}-${String(mes).padStart(2, '0')}`;

    // 1. Buscar contratos de locação ativos
    const contratos = await prisma.contratoImovelLocacao.findMany({
      include: {
        imovelLocacao: {
          include: {
            locadors: true,
            periodos: true,
          },
        },
        locatarios: true,
        imovel: true,
      },
    });

    let geradosCount = 0;
    const errors: string[] = [];

    // 2. Iterar por cada contrato para gerar a cobrança
    for (const contrato of contratos) {
      if (!contrato.imovelLocacao) continue;

      try {
        // Verificar se já existe cobrança de aluguel para esse contrato nessa competência
        const cobrancasExistentes = await prisma.transacaoFinanceira.findMany({
          where: {
            contratoId: contrato.id,
            categoria: "ALUGUEL",
            tipo: "RECEITA",
          },
        });

        const jaBoleto = cobrancasExistentes.some((tx) => {
          const meta = tx.metadata as any;
          return meta && meta.competence === competence;
        });

        if (jaBoleto) continue; // Pula se já gerado

        const locacao = contrato.imovelLocacao;
        
        // Encontrar período vigente se houver sub-períodos cadastrados
        const targetDate = new Date(ano, mes - 1, 15);
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

        const inquilinoNome = contrato.locatarios[0]?.nome || "Inquilino";
        const dataVencimento = new Date(ano, mes - 1, 10); // Vencimento padrão todo dia 10

        const metadata = {
          competence,
          rentValue: valorAluguel,
          condominiumValue: hasCondominio ? valorCondominio : 0,
          iptuValue: hasIPTU ? valorIPTU : 0,
        };

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

    revalidatePath("/cobrancas");
    revalidatePath("/financeiro");

    return { success: true, geradosCount, errors };
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

// Cria automaticamente o repasse de locador correspondente a um aluguel liquidado
export async function criarRepassePendente(rentTransactionId: string) {
  try {
    const rentTx = await prisma.transacaoFinanceira.findUnique({
      where: { id: rentTransactionId },
      include: {
        contrato: {
          include: {
            imovel: true,
            imovelLocacao: {
              include: {
                locadors: true,
              },
            },
          },
        },
      },
    });

    if (!rentTx || rentTx.categoria !== "ALUGUEL" || rentTx.status !== "LIQUIDADO") {
      return;
    }

    // Verificar se já existe um repasse associado a este aluguel
    const repassesContrato = await prisma.transacaoFinanceira.findMany({
      where: {
        contratoId: rentTx.contratoId,
        categoria: "REPASSE",
      },
    });

    const alreadyExists = repassesContrato.some((r) => {
      const meta = r.metadata as any;
      return meta && meta.rentTransactionId === rentTransactionId;
    });

    if (alreadyExists) {
      console.log(`[criarRepassePendente] Repasse já existe para transação de aluguel: ${rentTransactionId}`);
      return;
    }

    const contrato = rentTx.contrato;
    if (!contrato || !contrato.imovel) return;

    // Obter percentual da taxa de administração do imóvel (aluguelDados JSON)
    const aluguelDados = (contrato.imovel.aluguelDados as any) || {};
    const adminFeeStr = aluguelDados.taxaAdministracao || "10,00";
    const adminFeePercent = parseFloat(adminFeeStr.replace(",", ".")) || 10.0;

    const rentMeta = (rentTx.metadata as any) || {};
    const rentValue = rentMeta.rentValue || rentTx.valor;
    const adminFeeValue = rentValue * (adminFeePercent / 100);

    // Buscar despesas de manutenção pagas no mesmo mês de competência deste imóvel
    const competence = rentMeta.competence || new Date(rentTx.dataVencimento).toISOString().slice(0, 7);
    const [ano, mesStr] = competence.split("-");
    const mes = parseInt(mesStr);
    const startDate = new Date(parseInt(ano), mes - 1, 1);
    const endDate = new Date(parseInt(ano), mes, 0, 23, 59, 59);

    const manutencoes = await prisma.transacaoFinanceira.findMany({
      where: {
        imovelId: contrato.imovelId,
        tipo: "DESPESA",
        categoria: "CUSTO_OPERACIONAL",
        status: "LIQUIDADO",
        dataPagamento: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const maintenanceTotal = manutencoes.reduce((sum, tx) => sum + tx.valor, 0);
    const maintenanceIds = manutencoes.map((tx) => tx.id);

    // Valor Bruto Total pago (inclui aluguel + taxas acessórias conforme o contrato)
    const grossTotal = rentTx.valor;
    // O valor líquido repassado = Valor total pago - taxa de administração (calculada sobre o aluguel) - manutenção
    const netValue = grossTotal - adminFeeValue - maintenanceTotal;

    const ownerName = contrato.imovelLocacao?.locadors?.[0]?.nome || "Proprietário";
    const propertyTitle = contrato.imovel.titulo || `Cód ${contrato.imovel.codigo}`;

    const repasseMetadata = {
      rentTransactionId: rentTx.id,
      grossRentValue: rentValue,
      grossTotalValue: grossTotal,
      adminFeePercent,
      adminFeeValue,
      deductedMaintenanceIds: maintenanceIds,
      deductedMaintenanceValue: maintenanceTotal,
      competence,
    };

    await prisma.transacaoFinanceira.create({
      data: {
        descricao: `Repasse - ${ownerName} (${propertyTitle}) - Competência ${mesStr}/${ano}`,
        valor: netValue < 0 ? 0 : netValue,
        tipo: "DESPESA",
        categoria: "REPASSE",
        status: "PENDENTE",
        dataVencimento: new Date(),
        contratoId: contrato.id,
        imovelId: contrato.imovelId,
        metadata: repasseMetadata as any,
      },
    });

    console.log(`[criarRepassePendente] Criou repasse pendente para aluguel ${rentTransactionId} com valor líquido de R$${netValue}`);
    
    revalidatePath("/pagamentos");
    revalidatePath("/financeiro");
  } catch (error) {
    console.error("[criarRepassePendente] Erro ao criar repasse automático:", error);
  }
}
