import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { extrairRecebimentoCobrancaInter } from "../lib/inter-cobranca";

const interSource = readFileSync(
  fileURLToPath(new URL("../lib/inter.ts", import.meta.url)),
  "utf8",
);
const tableSource = readFileSync(
  fileURLToPath(new URL("../components/cobrancas/FinancialTable.tsx", import.meta.url)),
  "utf8",
);

test("sincroniza detalhes e busca o PDF de solicitações concluídas posteriormente", () => {
  const consultation = interSource.slice(
    interSource.indexOf("export async function consultarBolePixAction"),
    interSource.indexOf("export async function simularPagamentoBolePixAction"),
  );

  assert.match(consultation, /data\.boleto\?\.nossoNumero/);
  assert.match(consultation, /extrairSituacaoCobrancaInter\(data\)/);
  assert.match(consultation, /cobrancas\/\$\{transacao\.interCodigoSolicitacao\}\/pdf/);
  assert.match(consultation, /interPdfKey: pdfKey/);
  assert.match(consultation, /situacao === "RECEBIDO"/);
  assert.match(consultation, /\[inter-consulta\] Resultado da cobrança/);
  assert.match(consultation, /\[inter-consulta\] Consultando cobrança no Banco Inter/);
  assert.match(consultation, /timeout: INTER_QUERY_TIMEOUT_MS/);
  assert.match(consultation, /não respondeu à consulta/);
  assert.match(consultation, /interValorRecebido/);
  assert.match(consultation, /interOrigemRecebimento/);
});

test("extrai os dados reais do recebimento retornados pela Cobrança V3", () => {
  const recebimento = extrairRecebimentoCobrancaInter({
    cobranca: {
      seuNumero: "ALUGUEL-123",
      dataSituacao: "2026-08-03",
      valorTotalRecebido: "1370.50",
      origemRecebimento: "PIX",
    },
  });

  assert.equal(recebimento.data?.toISOString(), "2026-08-03T12:00:00.000Z");
  assert.equal(recebimento.valor, 1370.5);
  assert.equal(recebimento.origem, "PIX");
  assert.equal(recebimento.seuNumero, "ALUGUEL-123");
});

test("cobrança em processamento oferece atualização em vez de reemissão", () => {
  assert.match(tableSource, /\? handleSincronizarBoleto\(item\.id\)/);
  assert.match(tableSource, /"Atualizar boleto"/);
  assert.match(tableSource, /O Banco Inter ainda está processando esta cobrança/);
});

test("menu de ações escapa da área rolável e mantém composição visível", () => {
  assert.match(tableSource, /createPortal/);
  assert.match(tableSource, /className="fixed z-\[80\] w-56/);
  assert.match(tableSource, />\s*Composição\s*<\/button>/);
  assert.doesNotMatch(tableSource, /bottom-\[calc\(50%\+1\.5rem\)\]/);
});

test("timeout da consulta inicial preserva a solicitação como processamento aceito", () => {
  assert.match(interSource, /return \{ success: true, processing: true \}/);
});
