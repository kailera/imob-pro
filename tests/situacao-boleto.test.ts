import test from "node:test";
import assert from "node:assert/strict";
import { resolverSituacaoVisualBoleto } from "../lib/financeiro/situacao-boleto";

const base = {
  status: "PENDENTE",
  dataVencimento: "2026-08-20T00:00:00.000Z",
  hoje: "2026-08-29",
};

test("identifica cobrança sem boleto emitido", () => {
  const estado = resolverSituacaoVisualBoleto(base);
  assert.equal(estado.situacao, "Não gerado");
  assert.equal(estado.interStatusLabel, "Não gerado");
});

test("marca boleto vencido ativo como não pago e informa os encargos", () => {
  const estado = resolverSituacaoVisualBoleto({
    ...base,
    interNossoNumero: "123",
    interStatus: "APROVADO",
    metadata: { billingConditions: { lateFeePercentage: 10, lateInterestMonthly: 1 } },
  });
  assert.equal(estado.situacao, "Não pago");
  assert.equal(estado.interStatusLabel, "Boleto vigente com multa");
  assert.equal(estado.boletoAtivo, true);
});

test("oferece correção e reemissão quando o boleto vencido foi encerrado", () => {
  const estado = resolverSituacaoVisualBoleto({
    ...base,
    interCodigoSolicitacao: "codigo",
    interStatus: "CANCELADO",
  });
  assert.equal(estado.situacao, "Não pago");
  assert.equal(estado.podeCorrigirEReemitir, true);
});

test("prioriza liquidação confirmada pelo banco", () => {
  const estado = resolverSituacaoVisualBoleto({
    ...base,
    interNossoNumero: "123",
    interStatus: "PAGO",
  });
  assert.equal(estado.situacao, "Liquidado");
});
