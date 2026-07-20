import fs from "fs";
import path from "path";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/index.js";
import dotenv from "dotenv";
import { parse } from "csv-parse/sync";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─── Helpers ───────────────────────────────────────────────────

/** Remove acentos e converte para lowercase para matching robusto */
function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Parse valor BRL: "R$ 1.234,56" → 1234.56 */
function parseBRL(valStr: string | undefined): number {
  if (!valStr || valStr.trim() === "" || valStr.trim() === "-") return 0;
  const cleaned = valStr
    .replace(/R\$\s*/g, "")
    .replace(/\./g, "")      // Remove separador de milhar
    .replace(/,/g, ".")      // Vírgula decimal → ponto
    .trim();
  const value = parseFloat(cleaned);
  return isNaN(value) ? 0 : value;
}

/** Parse data BR: "15/07/2026" ou "15/07/2026 01:00:43" → Date */
function parseDateBR(dateStr: string | undefined): Date | null {
  if (!dateStr || dateStr.trim() === "" || dateStr.trim() === "-") return null;
  const clean = dateStr.trim();
  // Pode ser "DD/MM/AAAA" ou "DD/MM/AAAA HH:MM:SS"
  const parts = clean.split(" ")[0].split("/");
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  const date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0));
  return isNaN(date.getTime()) ? null : date;
}

/** Mapeia status bancário do Inter → StatusTransacao do Prisma */
function mapStatus(situacao: string): "PENDENTE" | "LIQUIDADO" | "CANCELADO" {
  const s = situacao.trim().toLowerCase();
  if (s === "liquidado" || s === "baixado") return "LIQUIDADO";
  if (s === "cancelado" || s === "falha") return "CANCELADO";
  return "PENDENTE"; // Recepcionado, Registrado, etc.
}

/** Extrai nome e CPF do campo Sacado (pode ser "Nome\nCPF" ou só "Nome") */
function parseSacado(sacadoRaw: string): { nome: string; cpf: string } {
  if (!sacadoRaw) return { nome: "", cpf: "" };
  const lines = sacadoRaw.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  const nome = lines[0] || "";
  // CPF tem formato XXX.XXX.XXX-XX
  const cpf = lines.find(l => /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(l)) || "";
  return { nome, cpf };
}

// ─── Main ──────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  INGESTÃO DE COBRANÇAS + CRUZAMENTO COM CONTRATOS");
  console.log("═══════════════════════════════════════════════════════════\n");

  // 1. Ler o CSV
  const csvPath = path.resolve("..", "dataset scatolin - cobranca.csv");
  if (!fs.existsSync(csvPath)) {
    console.error(`Erro: Arquivo CSV não encontrado: ${csvPath}`);
    process.exit(1);
  }

  const rawContent = fs.readFileSync(csvPath, "utf-8");

  // 2. O CSV tem cabeçalho irregular: linha 1 são vírgulas vazias, linha 2 são os nomes de coluna
  //    E os dados reais começam de um jeito estranho com colunas deslocadas.
  //    Vamos fazer parse manual mais robusto.
  const allRecords = parse(rawContent, {
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  }) as string[][];

  console.log(`Linhas brutas no CSV: ${allRecords.length}`);

  // 3. Identificar onde começam os dados reais
  //    Procuramos linhas que têm um número sequencial na posição esperada
  interface CobrancaRow {
    seq: string;
    recepcao: string;
    movimento: string;
    vencimento: string;
    situacao: string;
    valor: string;
    cedente: string;
    sacado: string;
    pagamento: string;
  }

  const cobrancas: CobrancaRow[] = [];

  for (const row of allRecords) {
    // Tentar encontrar os dados em diferentes posições (o CSV tem colunas deslocadas)
    // Padrão observado: os dados podem estar nas posições [1..9] ou [11..18]
    let seq = "", recepcao = "", movimento = "", vencimento = "";
    let situacao = "", valor = "", cedente = "", sacado = "", pagamento = "";

    // Padrão 1: colunas [1] a [8] (maioria das linhas)
    if (row[1] && /^\d+$/.test(row[1].trim())) {
      seq = row[1];
      recepcao = row[2] || "";
      movimento = row[3] || "";
      vencimento = row[4] || "";
      situacao = row[5] || "";
      valor = row[6] || "";
      cedente = row[7] || "";
      sacado = row[8] || "";
      pagamento = row[9] || "";
    }
    // Padrão 2: colunas [11] a [18] (algumas linhas do início)
    else if (row[11] && /^\d+$/.test(row[11].trim())) {
      seq = row[11];
      recepcao = row[12] || "";
      movimento = row[13] || "";
      vencimento = row[14] || "";
      situacao = row[15] || "";
      valor = row[16] || "";
      cedente = row[17] || "";
      sacado = row[18] || "";
      pagamento = row[19] || "";
    }

    if (seq && situacao) {
      cobrancas.push({ seq, recepcao, movimento, vencimento, situacao, valor, cedente, sacado, pagamento });
    }
  }

  console.log(`Cobranças válidas extraídas: ${cobrancas.length}\n`);

  // 4. Carregar todos os locatários com seus contratos do banco
  const locatarios = await prisma.locatario.findMany({
    include: {
      contrato: {
        include: {
          imovel: true,
          imovelLocacao: {
            include: {
              locadors: true,
            }
          }
        }
      }
    }
  });

  console.log(`Locatários no banco: ${locatarios.length}`);

  // 5. Criar índice de busca por nome normalizado
  const locatarioIndex = new Map<string, typeof locatarios[0]>();
  for (const loc of locatarios) {
    const normalized = normalizeName(loc.nome);
    if (!locatarioIndex.has(normalized)) {
      locatarioIndex.set(normalized, loc);
    }
  }
  console.log(`Nomes normalizados indexados: ${locatarioIndex.size}\n`);

  // 6. Processar cada cobrança
  let cruzadas = 0;
  let naoCruzadas = 0;
  let cpfsAtualizados = 0;
  let criadas = 0;
  let erros = 0;
  const naoCruzadasList: string[] = [];

  for (const cob of cobrancas) {
    try {
      const { nome: sacadoNome, cpf: sacadoCpf } = parseSacado(cob.sacado);
      const normalizedSacado = normalizeName(sacadoNome);
      const dataVencimento = parseDateBR(cob.vencimento);
      const valor = parseBRL(cob.valor);
      const status = mapStatus(cob.situacao);

      if (!dataVencimento) {
        console.warn(`  ⚠ Cobrança #${cob.seq}: data de vencimento inválida "${cob.vencimento}"`);
        erros++;
        continue;
      }

      // Parse pagamento (pode ser "09/06/2025\nR$ 1.370,00" ou "-" ou vazio)
      let dataPagamento: Date | null = null;
      let valorPago: number | null = null;
      if (cob.pagamento && cob.pagamento.trim() !== "-" && cob.pagamento.trim() !== "") {
        const pagLines = cob.pagamento.split("\n").map(l => l.trim()).filter(l => l.length > 0);
        dataPagamento = parseDateBR(pagLines[0]);
        if (pagLines.length > 1) {
          valorPago = parseBRL(pagLines[1]);
        }
      }

      // Buscar locatário
      const locatario = locatarioIndex.get(normalizedSacado);
      let contratoId: string | null = null;
      let imovelId: string | null = null;

      if (locatario && locatario.contrato) {
        contratoId = locatario.contrato.id;
        imovelId = locatario.contrato.imovelId;
        cruzadas++;

        // Atualizar CPF do locatário se vazio
        if (sacadoCpf && (!locatario.cpfCnpj || locatario.cpfCnpj.trim() === "")) {
          await prisma.locatario.update({
            where: { id: locatario.id },
            data: { cpfCnpj: sacadoCpf },
          });
          cpfsAtualizados++;
          // Atualizar no cache local também para não re-atualizar
          locatario.cpfCnpj = sacadoCpf;
        }
      } else {
        naoCruzadas++;
        if (!naoCruzadasList.includes(sacadoNome)) {
          naoCruzadasList.push(sacadoNome);
        }
      }

      // Criar TransacaoFinanceira
      await prisma.transacaoFinanceira.create({
        data: {
          descricao: `Cobrança #${cob.seq} - ${sacadoNome}`,
          valor,
          tipo: "RECEITA",
          categoria: "ALUGUEL",
          status,
          dataVencimento,
          dataPagamento,
          contratoId,
          imovelId,
          metadata: {
            numeroSequencial: parseInt(cob.seq),
            sacadoNome,
            sacadoCpf,
            cedente: cob.cedente,
            recepcao: cob.recepcao,
            movimento: cob.movimento,
            situacaoOriginal: cob.situacao,
            valorPago,
            fonte: "dataset-scatolin-cobranca-csv",
          },
        },
      });

      criadas++;
    } catch (err: any) {
      console.error(`  ✗ Erro na cobrança #${cob.seq}:`, err.message);
      erros++;
    }
  }

  // 7. Relatório final
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  RELATÓRIO DE INGESTÃO");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  Total de cobranças processadas: ${cobrancas.length}`);
  console.log(`  TransacaoFinanceira criadas:    ${criadas}`);
  console.log(`  Cruzadas com contrato:          ${cruzadas}`);
  console.log(`  Sem contrato correspondente:    ${naoCruzadas}`);
  console.log(`  CPFs de locatários atualizados: ${cpfsAtualizados}`);
  console.log(`  Erros:                          ${erros}`);

  if (naoCruzadasList.length > 0) {
    console.log("\n  Sacados sem contrato correspondente:");
    for (const nome of naoCruzadasList) {
      console.log(`    • ${nome}`);
    }
  }

  console.log("\n═══════════════════════════════════════════════════════════\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
