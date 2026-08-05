import assert from "node:assert/strict";
import test from "node:test";
import { parseDataBcb } from "../lib/indices/bcb";
import { calcularVariacaoSicadi } from "../lib/indices/calculo";
import {
  INDICES_REAJUSTE,
  normalizarCodigoIndice,
  obterConfiguracaoIndice,
} from "../lib/indices/catalogo";

test("normaliza nomes legados sem manter índices ambíguos no cadastro", () => {
  assert.equal(normalizarCodigoIndice("IGPM"), "IGP-M");
  assert.equal(normalizarCodigoIndice("IGP"), null);
  assert.equal(normalizarCodigoIndice("IPC"), null);
  assert.equal(normalizarCodigoIndice("IVAR"), null);
});

test("mantém o catálogo simples com as seis séries SGS validadas", () => {
  assert.equal(INDICES_REAJUSTE.length, 6);
  assert.equal(obterConfiguracaoIndice("IPCA").serieBcb, 433);
  assert.equal(obterConfiguracaoIndice("INPC").serieBcb, 188);
  assert.equal(obterConfiguracaoIndice("IGP-M").serieBcb, 189);
  assert.equal(obterConfiguracaoIndice("IGP-DI").serieBcb, 190);
  assert.equal(obterConfiguracaoIndice("IPC-FIPE").serieBcb, 193);
  assert.equal(obterConfiguracaoIndice("IPC-DI").serieBcb, 191);
});

test("interpreta explicitamente as datas dd/MM/yyyy do BCB", () => {
  assert.equal(parseDataBcb("01/06/2026").toISOString(), "2026-06-01T00:00:00.000Z");
  assert.throws(() => parseDataBcb("2026-06-01"), /Data inválida/);
  assert.throws(() => parseDataBcb("31/02/2026"), /Data inválida/);
});

test("compõe as taxas mensais para calcular a prévia acumulada", () => {
  const resultado = calcularVariacaoSicadi([1, 1]);
  assert.equal(resultado.percentual, 2.01);
  assert.equal(resultado.fator, 1.0201);
});

test("arredonda o percentual acumulado para duas casas antes da aplicação", () => {
  const resultado = calcularVariacaoSicadi([1.2345, 1.2345]);
  assert.equal(resultado.percentual, 2.48);
  assert.equal(resultado.fator, 1.0248);
});
