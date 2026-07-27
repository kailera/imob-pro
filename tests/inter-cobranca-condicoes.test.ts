import test from "node:test";
import assert from "node:assert/strict";
import { criarDescontoInterV3, resolverBonificacaoLease } from "../lib/inter-cobranca";

test("usa a bonificação geral quando o período migrado não possui desconto", () => {
  assert.deepEqual(resolverBonificacaoLease({
    valorPeriodo: null,
    tipoPeriodo: null,
    diasPeriodo: null,
    valorContrato: "100.00",
    tipoContrato: "FIXED",
    diasContrato: 1,
  }), {
    valor: 100,
    tipo: "FIXED",
    diasAntesDoVencimento: 1,
  });
});

test("respeita desconto zero definido explicitamente no período", () => {
  assert.deepEqual(resolverBonificacaoLease({
    valorPeriodo: "0.00",
    tipoPeriodo: "FIXED",
    diasPeriodo: 1,
    valorContrato: "100.00",
    tipoContrato: "FIXED",
    diasContrato: 2,
  }), {
    valor: 0,
    tipo: "FIXED",
    diasAntesDoVencimento: 1,
  });
});

test("aceita o tipo percentual utilizado pelos contratos novos", () => {
  assert.deepEqual(criarDescontoInterV3({
    valor: 10,
    tipo: "PERCENT",
    diasAntesDoVencimento: 1,
  }), {
    codigo: "PERCENTUALDATAINFORMADA",
    quantidadeDias: 1,
    taxa: 10,
  });
});
