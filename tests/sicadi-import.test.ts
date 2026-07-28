import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSicadiPeriods,
  normalizeSicadiCode,
  parseSicadiDate,
  type SicadiCollectedContract,
} from "../lib/locacao/sicadi-import";

function contractFixture(): SicadiCollectedContract {
  return {
    contratoId: "CTR-TESTE",
    codigo: "00003",
    contrato: {
      dadosContrato: { diaVencimento: 27 },
      reajustes: [
        {
          quando: "27/08/2025",
          fator: 0.0296,
          indice: "IGPM",
        },
      ],
    },
    controles: [
      {
        inicioPeriodo: "27/08/2025",
        valorAluguel: 978.12,
        indiceReajuste: "IGPM",
        descontoPontualidade: 5.1118,
        multaAtraso: 2,
      },
      {
        inicioPeriodo: "27/08/2024",
        valorAluguel: 950,
        indiceReajuste: "IGPM",
        descontoPontualidade: 5.2631,
        multaAtraso: 2,
      },
    ],
  };
}

test("converte data brasileira para UTC sem deslocamento", () => {
  assert.equal(
    parseSicadiDate("27/08/2025").toISOString(),
    "2025-08-27T00:00:00.000Z",
  );
});

test("normaliza códigos numéricos preservando códigos textuais", () => {
  assert.equal(normalizeSicadiCode("00003"), "3");
  assert.equal(normalizeSicadiCode(" TesteCadas "), "testecadas");
});

test("ordena controles e usa a próxima vigência como fim exclusivo", () => {
  const periods = buildSicadiPeriods(contractFixture());

  assert.equal(periods.length, 2);
  assert.equal(
    periods[0].effectiveFrom.toISOString(),
    "2024-08-27T00:00:00.000Z",
  );
  assert.equal(
    periods[0].effectiveTo?.toISOString(),
    "2025-08-27T00:00:00.000Z",
  );
  assert.equal(periods[1].effectiveTo, null);
  assert.equal(periods[1].paymentDueDay, 27);
  assert.equal(periods[1].adjustmentIndex, "IGP-M");
  assert.equal(periods[1].adjustmentPercentage, 2.96);
  assert.equal(periods[1].previousRentAmount, 950);
  assert.equal(
    periods[1].externalId,
    "SICADI:CTR-TESTE:27/08/2025",
  );
  assert.equal(periods[1].reviewStatus, "REVIEWED");
});

test("rejeita contrato sem dia de vencimento válido", () => {
  const fixture = contractFixture();
  fixture.contrato.dadosContrato = { diaVencimento: 0 };

  assert.throws(
    () => buildSicadiPeriods(fixture),
    /dia de vencimento inválido/,
  );
});
