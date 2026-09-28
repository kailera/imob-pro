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
import fs from "node:fs";

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    console.log("=== RELATÓRIO COMPLETO DE VALIDAÇÃO DE CONTRATOS E GERAÇÃO DE BOLETOS ===");

    // 1. Buscar todos os Leases (Canônicos)
    const leases = await prisma.lease.findMany({
      include: {
        imob: true,
        property: {
          include: {
            residencial: { include: { despesas: true } }
          }
        },
        parties: {
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
    });

    // 2. Buscar todos os Contratos Legados (ContratoImovelLocacao)
    const legacyContracts = await prisma.contratoImovelLocacao.findMany({
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
      },
      orderBy: { id: "asc" }
    });

    // Contagem de status dos Leases
    const statusCounts = leases.reduce((acc, l) => {
      acc[l.status] = (acc[l.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log("\n1. Visão Geral dos Leases (Tabela lease):");
    console.table(Object.entries(statusCounts).map(([status, total]) => ({ Status: status, Quantidade: total })));

    // Separar válidos (excluindo inativos: SUSPENDED, TERMINATED, CANCELLED)
    const validLeases = leases.filter(l => !["SUSPENDED", "TERMINATED", "CANCELLED"].includes(l.status));
    const inactiveLeases = leases.filter(l => ["SUSPENDED", "TERMINATED", "CANCELLED"].includes(l.status));

    console.log(`\nContratos Leases válidos: ${validLeases.length}`);
    console.log(`Contratos Leases inativos (excluídos): ${inactiveLeases.length} (${inactiveLeases.map(l => `${l.code} [${l.status}]`).join(", ")})`);

    // 3. Deduplicação: identificar quais legados são cobertos por Leases Canônicos completos
    const completeLeases = leases.filter(isCompleteCanonicalLease);
    const legacyBillingCandidates = legacyContracts.filter(legacy => {
      return !findCompleteLeaseForLegacyContract(legacy, leases);
    });

    console.log(`\n2. Mapeamento Canônico vs Legado:`);
    console.log(` - Leases Canônicos Completos: ${completeLeases.length}`);
    console.log(` - Contratos Legados no banco: ${legacyContracts.length}`);
    console.log(` - Contratos Legados cobertos por Leases: ${legacyContracts.length - legacyBillingCandidates.length}`);
    console.log(` - Contratos Legados NÃO cobertos (que cobrariam via legado): ${legacyBillingCandidates.length}`);

    // 4. Analisar cada contrato válido (Leases válidos + Legados não cobertos)
    interface ContractBoletoInfo {
      origem: "CANONICO_LEASE" | "LEGADO_CONTRATO";
      id: string;
      codigo: string;
      codigoLegado?: string | null;
      status: string;
      // Pagador
      pagador: {
        nome: string;
        cpfCnpj: string;
        cpfCnpjValido: boolean;
        email?: string | null;
        telefone?: string | null;
        endereco: {
          logradouro: string;
          numero: string;
          complemento?: string | null;
          bairro: string;
          cidade: string;
          uf: string;
          cep: string;
          valido: boolean;
        };
      };
      // Imóvel
      imovel: {
        codigo: string;
        enderecoCompleto: string;
      };
      // Regras de Cobrança / Vencimento
      vencimento: {
        diaPadrao: number;
        primeiroVencimento?: string | null;
        simulacaoDataVencimento: string; // Ex: 2026-10-XX
      };
      // Valores
      valores: {
        aluguel: number;
        iptu: number;
        condominio: number;
        agua: number;
        energia: number;
        gas: number;
        residencialAdicional: number;
        totalNominal: number;
      };
      // Descontos de Pontualidade
      desconto: {
        possui: boolean;
        valor: number;
        tipo: string; // PERCENT ou FIXED
        diasAntesDoVencimento: number;
        dataLimiteCalculada: string;
        valorDescontoEfetivo: number;
        valorComDesconto: number;
        codigoInter: string;
      };
      // Multas e Juros
      multa: {
        percentual: number;
        diasCarencia: number;
        valorMultaCalculado: number;
      };
      juros: {
        percentualMensal: number;
        diasCarencia: number;
        proRataDia: boolean;
      };
      // Instruções e Mensagens para o Boleto (API Inter)
      instrucoesBoleto: string[];
      mensagemInterLinhas: string[];
      // Validação de Prontidão
      aptoParaEmissao: boolean;
      pendencias: string[];
    }

    const relatorioContratos: ContractBoletoInfo[] = [];

    // Processar Leases válidos
    for (const lease of validLeases) {
      const tenantParty = lease.parties.find(p => p.role === "TENANT" || p.isPrimary) ?? lease.parties[0];
      const person = tenantParty?.person;
      const address = person?.addresses?.[0];
      const currentPeriod = lease.termsPeriods[0];
      const terms = lease.terms;

      // Dia de vencimento
      const paymentDueDay = terms?.paymentDueDay ?? currentPeriod?.paymentDueDay ?? 10;
      const dueDayStr = String(paymentDueDay).padStart(2, "0");
      const simVencimentoDate = `2026-10-${dueDayStr}`;

      // Valores
      const rentValue = Number(currentPeriod?.rentAmount ?? terms?.rentValue ?? 0);
      const iptuValue = Number(lease.iptu?.amount ?? 0);
      const condoValue = Number(lease.condominium?.amount ?? 0);
      const waterValue = Number(lease.utilities.find(u => u.type === "WATER")?.amount ?? 0);
      const energyValue = Number(lease.utilities.find(u => u.type === "ELECTRICITY")?.amount ?? 0);
      const gasValue = Number(lease.utilities.find(u => u.type === "GAS")?.amount ?? 0);
      const totalNominal = Number((rentValue + iptuValue + condoValue + waterValue + energyValue + gasValue).toFixed(2));

      // Bonificação / Desconto
      const bonus = resolverBonificacaoLease({
        valorPeriodo: currentPeriod?.earlyPaymentDiscount ? Number(currentPeriod.earlyPaymentDiscount) : null,
        tipoPeriodo: currentPeriod?.discountType ?? null,
        diasPeriodo: currentPeriod?.discountDaysBefore ?? null,
        valorContrato: terms?.earlyPaymentDiscount ? Number(terms.earlyPaymentDiscount) : null,
        tipoContrato: terms?.discountType ?? null,
        diasContrato: terms?.discountDaysBefore ?? null,
      });

      const interDesconto = criarDescontoInterV3({
        tipo: bonus.tipo,
        valor: bonus.valor,
        diasAntesDoVencimento: bonus.diasAntesDoVencimento,
      });

      // Cálculo de valor efetivo do desconto
      let valorDescontoEfetivo = 0;
      if (bonus.valor > 0) {
        if (bonus.tipo === "PERCENT" || bonus.tipo === "PERCENTAGE") {
          valorDescontoEfetivo = Number((rentValue * (bonus.valor / 100)).toFixed(2));
        } else {
          valorDescontoEfetivo = bonus.valor;
        }
      }
      const valorComDesconto = Number((totalNominal - valorDescontoEfetivo).toFixed(2));

      // Data limite desconto
      const limiteDate = new Date(`${simVencimentoDate}T00:00:00.000Z`);
      limiteDate.setUTCDate(limiteDate.getUTCDate() - (bonus.diasAntesDoVencimento ?? 0));
      const dataLimiteDescontoStr = limiteDate.toISOString().slice(0, 10);

      // Multa e Juros
      const lateFeePercentage = Number(currentPeriod?.lateFeePercentage ?? terms?.lateFeePercentage ?? 10);
      const lateFeeDays = currentPeriod?.lateFeeDays ?? terms?.lateFeeDays ?? 1;
      const lateInterestMonthly = Number(currentPeriod?.lateInterestMonthly ?? terms?.lateInterestMonthly ?? 1);
      const lateInterestDays = currentPeriod?.lateInterestDays ?? terms?.lateInterestDays ?? 1;
      const valorMulta = Number((totalNominal * (lateFeePercentage / 100)).toFixed(2));

      // Instruções e Mensagens
      const instrucoes = criarInstrucoesBoletoInter({
        desconto: interDesconto,
        multaPercentual: lateFeePercentage,
        jurosMensal: lateInterestMonthly,
        dataVencimento: simVencimentoDate,
      });

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

      // Pendências / Auditoria
      const pendencias: string[] = [];
      const cpfDigits = (person?.cpfCnpj ?? "").replace(/\D/g, "");
      const cpfValido = cpfDigits.length === 11 || cpfDigits.length === 14;
      if (!person?.name) pendencias.push("Nome do pagador ausente");
      if (!cpfValido || cpfDigits === "00000000000") pendencias.push("CPF/CNPJ inválido ou ausente");
      if (!address?.cep || address.cep.length < 8) pendencias.push("CEP do pagador ausente ou incompleto");
      if (!address?.logradouro) pendencias.push("Logradouro do pagador ausente");
      if (rentValue <= 0) pendencias.push("Valor do aluguel zerado");
      if (currentPeriod && currentPeriod.reviewStatus !== "REVIEWED") pendencias.push("Período locatício pendente de conferência (reviewStatus != REVIEWED)");
      if (!currentPeriod && (!terms || Number(terms.rentValue) <= 0)) pendencias.push("Contrato sem período locatício ativo");

      relatorioContratos.push({
        origem: "CANONICO_LEASE",
        id: lease.id,
        codigo: lease.code,
        codigoLegado: lease.legacyCode,
        status: lease.status,
        pagador: {
          nome: person?.name ?? "AUSENTE",
          cpfCnpj: person?.cpfCnpj ?? "AUSENTE",
          cpfCnpjValido: cpfValido && cpfDigits !== "00000000000",
          email: person?.email ?? null,
          telefone: person?.phones?.[0]?.phone ?? null,
          endereco: {
            logradouro: address?.logradouro ?? "",
            numero: address?.numero ?? "",
            complemento: address?.complemento ?? null,
            bairro: address?.bairro ?? "",
            cidade: address?.municipio ?? "",
            uf: address?.estado ?? "",
            cep: address?.cep ?? "",
            valido: Boolean(address?.logradouro && address?.cep)
          }
        },
        imovel: {
          codigo: lease.property?.codigo ?? "S/ código",
          enderecoCompleto: lease.property ? `${lease.property.logradouro || "Logradouro s/n"}, ${lease.property.numero} - ${lease.property.bairro}, ${lease.property.cidade}/${lease.property.uf}` : "Sem imóvel vinculado"
        },
        vencimento: {
          diaPadrao: paymentDueDay,
          primeiroVencimento: terms?.firstPeriodDueDate?.toISOString().slice(0, 10) ?? null,
          simulacaoDataVencimento: simVencimentoDate
        },
        valores: {
          aluguel: rentValue,
          iptu: iptuValue,
          condominio: condoValue,
          agua: waterValue,
          energia: energyValue,
          gas: gasValue,
          residencialAdicional: 0,
          totalNominal
        },
        desconto: {
          possui: bonus.valor > 0,
          valor: bonus.valor,
          tipo: bonus.tipo ?? "PERCENT",
          diasAntesDoVencimento: bonus.diasAntesDoVencimento ?? 0,
          dataLimiteCalculada: dataLimiteDescontoStr,
          valorDescontoEfetivo,
          valorComDesconto,
          codigoInter: interDesconto?.codigo ?? "SEM_DESCONTO"
        },
        multa: {
          percentual: lateFeePercentage,
          diasCarencia: lateFeeDays,
          valorMultaCalculado: valorMulta
        },
        juros: {
          percentualMensal: lateInterestMonthly,
          diasCarencia: lateInterestDays,
          proRataDia: true
        },
        instrucoesBoleto: instrucoes,
        mensagemInterLinhas: Object.values(mensagemInter).filter(Boolean) as string[],
        aptoParaEmissao: pendencias.length === 0,
        pendencias
      });
    }

    // Processar Legados NÃO cobertos
    for (const leg of legacyBillingCandidates) {
      const locatario = leg.locatarios?.[0];
      const locacao = leg.imovelLocacao;
      const periodoAtivo = locacao?.periodos?.[0];
      const diaVenc = periodoAtivo?.diaVencimento ?? locacao?.diaVencimento ?? 10;
      const dueDayStr = String(diaVenc).padStart(2, "0");
      const simVencimentoDate = `2026-10-${dueDayStr}`;

      const rentValue = Number(periodoAtivo?.valorAluguel ?? locacao?.valorAluguel ?? 0);
      const iptuValue = Number(periodoAtivo?.valorIPTU ?? (locacao as any)?.valorIPTU ?? 0);
      const condoValue = Number(periodoAtivo?.valorCondominio ?? (locacao as any)?.valorCondominio ?? 0);
      const totalNominal = rentValue + iptuValue + condoValue;

      const descValor = Number(periodoAtivo?.descontoPontualidade ?? locacao?.descontoPontualidade ?? 0);
      const descTipo = periodoAtivo?.tipoDesconto ?? locacao?.tipoDesconto ?? "PERCENT";
      const descDias = periodoAtivo?.diasAntecedenciaDesc ?? locacao?.diasAntecedenciaDesc ?? 0;

      let valorDescontoEfetivo = 0;
      if (descValor > 0) {
        if (descTipo === "PERCENT" || descTipo === "PERCENTAGE") {
          valorDescontoEfetivo = Number((rentValue * (descValor / 100)).toFixed(2));
        } else {
          valorDescontoEfetivo = descValor;
        }
      }
      const valorComDesconto = Number((totalNominal - valorDescontoEfetivo).toFixed(2));

      const lateFeePercentage = Number(periodoAtivo?.multaAtrasoPercentual ?? locacao?.multaAtrasoPercentual ?? 10);
      const lateInterestMonthly = Number(periodoAtivo?.jurosAtrasoPercentual ?? locacao?.jurosAtrasoPercentual ?? 1);

      const interDesconto = criarDescontoInterV3({
        tipo: descTipo,
        valor: descValor,
        diasAntesDoVencimento: descDias,
      });

      const instrucoes = criarInstrucoesBoletoInter({
        desconto: interDesconto,
        multaPercentual: lateFeePercentage,
        jurosMensal: lateInterestMonthly,
        dataVencimento: simVencimentoDate,
      });

      const pendencias: string[] = [];
      const cpfDigits = (locatario?.cpfCnpj ?? "").replace(/\D/g, "");
      const cpfValido = cpfDigits.length === 11 || cpfDigits.length === 14;
      if (!locatario?.nome) pendencias.push("Nome do pagador ausente");
      if (!cpfValido || cpfDigits === "00000000000") pendencias.push("CPF/CNPJ inválido ou ausente no contrato legado");
      if (rentValue <= 0) pendencias.push("Valor de aluguel zerado no legado");

      const end = locatario?.endereco as any;
      if (!end?.cep) pendencias.push("CEP do pagador ausente no legado");

      relatorioContratos.push({
        origem: "LEGADO_CONTRATO",
        id: leg.id,
        codigo: `LEG-${leg.id}`,
        codigoLegado: leg.id,
        status: "LEGACY_ACTIVE",
        pagador: {
          nome: locatario?.nome ?? "AUSENTE",
          cpfCnpj: locatario?.cpfCnpj ?? "AUSENTE",
          cpfCnpjValido: cpfValido && cpfDigits !== "00000000000",
          email: locatario?.email ?? null,
          telefone: null,
          endereco: {
            logradouro: end?.logradouro ?? "",
            numero: end?.numero ?? "",
            complemento: end?.complemento ?? null,
            bairro: end?.bairro ?? "",
            cidade: end?.municipio ?? "",
            uf: end?.estado ?? "",
            cep: end?.cep ?? "",
            valido: Boolean(end?.logradouro && end?.cep)
          }
        },
        imovel: {
          codigo: leg.imovel?.codigo ?? "S/ código",
          enderecoCompleto: leg.imovel ? `${leg.imovel.logradouro || "Logradouro s/n"}, ${leg.imovel.numero} - ${leg.imovel.bairro}, ${leg.imovel.cidade}` : "Sem imóvel"
        },
        vencimento: {
          diaPadrao: diaVenc,
          primeiroVencimento: null,
          simulacaoDataVencimento: simVencimentoDate
        },
        valores: {
          aluguel: rentValue,
          iptu: iptuValue,
          condominio: condoValue,
          agua: 0,
          energia: 0,
          gas: 0,
          residencialAdicional: 0,
          totalNominal
        },
        desconto: {
          possui: descValor > 0,
          valor: descValor,
          tipo: descTipo,
          diasAntesDoVencimento: descDias,
          dataLimiteCalculada: simVencimentoDate,
          valorDescontoEfetivo,
          valorComDesconto,
          codigoInter: interDesconto?.codigo ?? "SEM_DESCONTO"
        },
        multa: {
          percentual: lateFeePercentage,
          diasCarencia: 1,
          valorMultaCalculado: Number((totalNominal * (lateFeePercentage / 100)).toFixed(2))
        },
        juros: {
          percentualMensal: lateInterestMonthly,
          diasCarencia: 1,
          proRataDia: true
        },
        instrucoesBoleto: instrucoes,
        mensagemInterLinhas: [`ALUG: RS ${rentValue.toFixed(2)}`],
        aptoParaEmissao: pendencias.length === 0,
        pendencias
      });
    }

    // Salvar JSON detalhado
    fs.writeFileSync("relatorio-validacao-contratos-boletos.json", JSON.stringify(relatorioContratos, null, 2));

    // Estatísticas finais
    const totalAptos = relatorioContratos.filter(c => c.aptoParaEmissao).length;
    const totalComPendencias = relatorioContratos.filter(c => !c.aptoParaEmissao).length;
    const somaAlugueisNominal = relatorioContratos.reduce((sum, c) => sum + c.valores.totalNominal, 0);

    console.log(`\n======================================================================`);
    console.log(`RESUMO CONSOLIDADO DE CONTRATOS VÁLIDOS E GERAÇÃO DE BOLETOS:`);
    console.log(`======================================================================`);
    console.log(`Total de contratos válidos mapeados: ${relatorioContratos.length}`);
    console.log(` - Contratos 100% Aptos para emissão imediata: ${totalAptos}`);
    console.log(` - Contratos com Pendências Cadastrais/Configuração: ${totalComPendencias}`);
    console.log(`Volume financeiro nominal estimado da carteira: R$ ${somaAlugueisNominal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
    console.log(`======================================================================\n`);

  } catch (error) {
    console.error("Erro ao validar contratos e boletos:", error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
