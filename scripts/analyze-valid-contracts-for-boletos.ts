import "dotenv/config";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/index.js";
import {
  findCompleteLeaseForLegacyContract,
  isCompleteCanonicalLease,
} from "../lib/locacao/contract-deduplication.js";
import {
  criarInstrucoesBoletoInter,
  criarDescontoInterV3,
  formatarMensagemInter,
  criarResumoComposicaoBoletoInter,
  resolverBonificacaoLease
} from "../lib/inter-cobranca.js";

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    console.log("=== ANÁLISE DE CONTRATOS VÁLIDOS E GERAÇÃO DE BOLETOS ===");

    // 1. Carregar todos os Leases e Legados
    const [leases, legacyContracts, transacoesRecentes] = await Promise.all([
      prisma.lease.findMany({
        include: {
          imob: true,
          property: {
            include: {
              residencial: { include: { despesas: true } }
            }
          },
          parties: {
            where: { role: { in: ["TENANT", "CO_TENANT"] } },
            include: {
              person: {
                include: {
                  phones: true,
                  addresses: true
                }
              }
            },
            orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }]
          },
          terms: true,
          termsPeriods: {
            orderBy: { effectiveFrom: "desc" }
          },
          iptu: true,
          condominium: true,
          utilities: true
        },
        orderBy: { code: "asc" }
      }),
      prisma.contratoImovelLocacao.findMany({
        include: {
          imovel: {
            include: {
              residencial: { include: { despesas: true } }
            }
          },
          imovelLocacao: {
            include: {
              locadors: true,
              periodos: { orderBy: { dataInicio: "desc" } }
            }
          },
          locatarios: true
        }
      }),
      prisma.transacaoFinanceira.findMany({
        where: { categoria: "ALUGUEL" },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          status: true,
          interStatus: true,
          dataVencimento: true,
          valor: true,
          descricao: true,
          metadata: true,
          leaseId: true,
          contratoId: true
        }
      })
    ]);

    console.log(`\nTotal de Leases no banco: ${leases.length}`);
    console.log(`Total de Contratos Legados no banco: ${legacyContracts.length}`);
    console.log(`Transações ALUGUEL recentes encontradas: ${transacoesRecentes.length}`);

    // Categorizar Leases
    const activeLeases = leases.filter(l => l.status === "ACTIVE");
    const draftLeases = leases.filter(l => l.status === "DRAFT");
    const suspendedLeases = leases.filter(l => l.status === "SUSPENDED");
    const terminatedLeases = leases.filter(l => l.status === "TERMINATED");
    const cancelledLeases = leases.filter(l => l.status === "CANCELLED");

    console.log("\nDistribuição de Leases:");
    console.log(` - ACTIVE: ${activeLeases.length}`);
    console.log(` - DRAFT: ${draftLeases.length}`);
    console.log(` - SUSPENDED: ${suspendedLeases.length}`);
    console.log(` - TERMINATED: ${terminatedLeases.length}`);
    console.log(` - CANCELLED: ${cancelledLeases.length}`);

    // Analisar contratos legados vs Leases
    const completeLeases = leases.filter(isCompleteCanonicalLease);
    const legacyMatchedCount = legacyContracts.filter(leg => 
      findCompleteLeaseForLegacyContract(leg, completeLeases)
    ).length;
    console.log(`\nContratos legados correspondentes a Leases canônicos completos: ${legacyMatchedCount} de ${legacyContracts.length}`);

    // Focar nos contratos válidos (exceto inativos: SUSPENDED, TERMINATED, CANCELLED)
    const validLeases = leases.filter(l => !["SUSPENDED", "TERMINATED", "CANCELLED"].includes(l.status));
    console.log(`\n>>> Contratos válidos considerados para faturamento: ${validLeases.length}`);

    // Para cada contrato válido, simular a extração dos dados que geram o boleto
    const billingAnalysis = validLeases.map(l => {
      const tenantParty = l.parties.find(p => p.role === "TENANT" || p.isPrimary) ?? l.parties[0];
      const person = tenantParty?.person;
      const address = person?.addresses?.[0];
      const currentPeriod = l.termsPeriods[0];
      const terms = l.terms;

      // 1. Data de Vencimento
      const paymentDueDay = terms?.paymentDueDay ?? currentPeriod?.paymentDueDay ?? 10;
      const firstPeriodDueDate = terms?.firstPeriodDueDate;

      // 2. Valores base
      const rentValue = Number(currentPeriod?.rentAmount ?? terms?.rentValue ?? 0);
      const iptuValue = Number(l.iptu?.amount ?? 0);
      const condoValue = Number(l.condominium?.amount ?? 0);
      
      const waterValue = Number(l.utilities.find(u => u.type === "WATER")?.amount ?? 0);
      const energyValue = Number(l.utilities.find(u => u.type === "ELECTRICITY")?.amount ?? 0);
      const gasValue = Number(l.utilities.find(u => u.type === "GAS")?.amount ?? 0);

      const totalNominal = rentValue + iptuValue + condoValue + waterValue + energyValue + gasValue;

      // 3. Desconto de pontualidade
      const bonus = resolverBonificacaoLease({
        valorPeriodo: currentPeriod?.earlyPaymentDiscount ? Number(currentPeriod.earlyPaymentDiscount) : null,
        tipoPeriodo: currentPeriod?.discountType ?? null,
        diasPeriodo: currentPeriod?.discountDaysBefore ?? null,
        valorContrato: terms?.earlyPaymentDiscount ? Number(terms.earlyPaymentDiscount) : null,
        tipoContrato: terms?.discountType ?? null,
        diasContrato: terms?.discountDaysBefore ?? null,
      });

      // 4. Multas e Juros
      const lateFeePercentage = Number(currentPeriod?.lateFeePercentage ?? terms?.lateFeePercentage ?? 10);
      const lateInterestMonthly = Number(currentPeriod?.lateInterestMonthly ?? terms?.lateInterestMonthly ?? 1);

      // 5. Exemplo de Vencimento simulado (para o próximo mês corrente, ex: 10/10/2026 ou dia de vencimento do contrato)
      const dueDayStr = String(paymentDueDay).padStart(2, '0');
      const simVencimentoDate = `2026-10-${dueDayStr}`;

      // Montar desconto Inter V3
      const interDesconto = criarDescontoInterV3({
        tipo: bonus.tipo,
        valor: bonus.valor,
        diasAntesDoVencimento: bonus.diasAntesDoVencimento,
      });

      // Montar instruções do boleto Inter
      const instrucoes = criarInstrucoesBoletoInter({
        desconto: interDesconto,
        multaPercentual: lateFeePercentage,
        jurosMensal: lateInterestMonthly,
        dataVencimento: simVencimentoDate,
      });

      // Montar itens de composição / descrição
      const itemsComposicao = [
        { type: "RENT", description: "Aluguel", amount: rentValue },
        ...(iptuValue > 0 ? [{ type: "IPTU", description: "IPTU", amount: iptuValue }] : []),
        ...(condoValue > 0 ? [{ type: "CONDOMINIUM", description: "Condomínio", amount: condoValue }] : []),
        ...(waterValue > 0 ? [{ type: "WATER", description: "Água", amount: waterValue }] : []),
        ...(energyValue > 0 ? [{ type: "ENERGY", description: "Energia", amount: energyValue }] : []),
        ...(gasValue > 0 ? [{ type: "GAS", description: "Gás", amount: gasValue }] : []),
      ];

      const linhasDescricao = criarResumoComposicaoBoletoInter({
        metadata: {
          rentValue,
          iptuValue,
          condominiumValue: condoValue,
          waterValue,
          electricityValue: energyValue,
          gasValue,
        },
        valorNominal: totalNominal,
        dataVencimento: simVencimentoDate,
        items: itemsComposicao as any,
      });

      const mensagemInter = formatarMensagemInter(linhasDescricao.join("\n"));

      // Status de prontidão para emissão de boleto
      const readinessIssues: string[] = [];
      if (!person?.name) readinessIssues.push("Nome do pagador ausente");
      if (!person?.cpfCnpj || person.cpfCnpj === "00000000000") readinessIssues.push("CPF/CNPJ inválido ou ausente");
      if (!address?.cep) readinessIssues.push("CEP do pagador ausente");
      if (!address?.logradouro) readinessIssues.push("Endereço do pagador ausente");
      if (rentValue <= 0) readinessIssues.push("Valor do aluguel zerado");
      if (currentPeriod && currentPeriod.reviewStatus !== "REVIEWED") readinessIssues.push("Período não conferido (reviewStatus != REVIEWED)");
      if (!currentPeriod && (!terms || Number(terms.rentValue) <= 0)) readinessIssues.push("Sem período locatício e sem termos de aluguel");

      return {
        leaseId: l.id,
        code: l.code,
        status: l.status,
        imovelCodigo: l.property?.codigo ?? "S/ código",
        imovelEndereco: l.property ? `${l.property.logradouro}, ${l.property.numero} - ${l.property.bairro}` : "Sem endereço",
        pagadorNome: person?.name ?? "AUSENTE",
        pagadorCpfCnpj: person?.cpfCnpj ?? "AUSENTE",
        pagadorCep: address?.cep ?? "AUSENTE",
        diaVencimento: paymentDueDay,
        valorAluguel: rentValue,
        valorTotalNominal: totalNominal,
        descontoPontualidade: {
          valor: bonus.valor,
          tipo: bonus.tipo,
          diasAntesDoVencimento: bonus.diasAntesDoVencimento,
          interCodigo: interDesconto?.codigo ?? "SEM_DESCONTO"
        },
        multaPercentual: lateFeePercentage,
        jurosMensalPercentual: lateInterestMonthly,
        instrucoesBoleto: instrucoes,
        linhasDescricaoComposicao: linhasDescricao,
        mensagemInter,
        itemsComposicao,
        reviewStatus: currentPeriod?.reviewStatus ?? "SEM_PERIODO",
        readinessIssues
      };
    });

    // Salvar o resultado detalhado em JSON
    const fs = await import("node:fs");
    fs.writeFileSync(
      "contracts-boleto-data-analysis.json",
      JSON.stringify(billingAnalysis, null, 2)
    );

    // Estatísticas de Validação
    const aptos = billingAnalysis.filter(b => b.readinessIssues.length === 0);
    const comPendencias = billingAnalysis.filter(b => b.readinessIssues.length > 0);

    console.log(`\n======================================================`);
    console.log(`ESTATÍSTICAS DE PRONTIDÃO PARA BOLETOS:`);
    console.log(`Total contratos válidos analisados: ${billingAnalysis.length}`);
    console.log(` - Prontos sem nenhuma pendência: ${aptos.length}`);
    console.log(` - Com pendências cadastrais/revisão: ${comPendencias.length}`);
    console.log(`======================================================\n`);

    // Mostrar os tipos de pendências mais comuns
    const issuesMap: Record<string, number> = {};
    comPendencias.forEach(c => {
      c.readinessIssues.forEach(issue => {
        issuesMap[issue] = (issuesMap[issue] || 0) + 1;
      });
    });
    console.log("Principais pendências encontradas nos contratos:");
    console.table(Object.entries(issuesMap).map(([pendencia, count]) => ({ pendencia, quantidade: count })));

    // Mostrar amostra de 10 contratos prontos
    console.log("\nAmostra de contratos analisados com dados que geram o boleto:");
    console.table(
      billingAnalysis.slice(0, 10).map(c => ({
        Contrato: c.code,
        Status: c.status,
        Inquilino: c.pagadorNome.slice(0, 20),
        CPF: c.pagadorCpfCnpj,
        DiaVenc: c.diaVencimento,
        Aluguel: `R$ ${c.valorAluguel.toFixed(2)}`,
        Total: `R$ ${c.valorTotalNominal.toFixed(2)}`,
        Desconto: c.descontoPontualidade.valor > 0 ? `${c.descontoPontualidade.valor} (${c.descontoPontualidade.tipo}, ${c.descontoPontualidade.diasAntesDoVencimento}d)` : "0",
        Multa: `${c.multaPercentual}%`,
        Juros: `${c.jurosMensalPercentual}% a.m.`,
        Pendências: c.readinessIssues.length
      }))
    );

    console.log("\nArquivo detalhado gerado com sucesso: contracts-boleto-data-analysis.json");

  } catch (error) {
    console.error("Erro na análise:", error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
