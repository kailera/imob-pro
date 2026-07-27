import assert from "node:assert/strict";
import test from "node:test";
import { calcularIptuDaCobranca, parseQuantidadeParcelas } from "../lib/locacao/iptu";

const iptu = {
  amount: 125.5,
  paymentStartDate: new Date("2026-03-01T00:00:00.000Z"),
  installments: "3",
};

test("inclui o IPTU somente durante a quantidade de parcelas configurada", () => {
  assert.deepEqual(calcularIptuDaCobranca(iptu, new Date("2026-02-10T00:00:00.000Z")), {
    valor: 0,
    numeroParcela: null,
    quantidadeParcelas: 3,
  });
  assert.equal(calcularIptuDaCobranca(iptu, new Date("2026-03-10T00:00:00.000Z")).numeroParcela, 1);
  assert.equal(calcularIptuDaCobranca(iptu, new Date("2026-05-10T00:00:00.000Z")).numeroParcela, 3);
  assert.equal(calcularIptuDaCobranca(iptu, new Date("2026-06-10T00:00:00.000Z")).valor, 0);
});

test("inicia no mês seguinte quando a data inicial é posterior ao vencimento", () => {
  const resultado = calcularIptuDaCobranca(
    { ...iptu, paymentStartDate: new Date("2026-03-20T00:00:00.000Z") },
    new Date("2026-04-10T00:00:00.000Z"),
  );
  assert.equal(resultado.numeroParcela, 1);
  assert.equal(resultado.valor, 125.5);
});

test("aceita apenas quantidade inteira positiva", () => {
  assert.equal(parseQuantidadeParcelas("10"), 10);
  assert.equal(parseQuantidadeParcelas("10 parcelas"), null);
  assert.equal(parseQuantidadeParcelas("0"), null);
});
