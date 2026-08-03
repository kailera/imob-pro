import assert from "node:assert/strict";
import test from "node:test";
import {
  formatImovelAddress,
  getVistoriaAddress,
  snapshotVistoriaAddress,
} from "../lib/vistorias/formatters";

test("a vistoria usa seu endereco salvo mesmo quando o imovel muda", () => {
  const imovel = {
    logradouro: "Rua Antiga",
    numero: 10,
    bairro: "Centro",
    cidade: "Ilha Solteira",
    uf: "SP",
  };
  const enderecoSnapshot = snapshotVistoriaAddress(imovel);

  imovel.logradouro = "Rua Nova";
  imovel.numero = 99;

  assert.equal(
    formatImovelAddress(getVistoriaAddress({ enderecoSnapshot, imovel })),
    "Rua Antiga, 10 - Centro, Ilha Solteira/SP",
  );
});

test("vistorias antigas sem snapshot continuam usando o endereco do imovel", () => {
  const imovel = {
    logradouro: "Avenida Brasil",
    numero: 1200,
    bairro: "Centro",
    cidade: "Ilha Solteira",
    uf: "SP",
  };

  assert.equal(
    formatImovelAddress(getVistoriaAddress({ imovel })),
    "Avenida Brasil, 1200 - Centro, Ilha Solteira/SP",
  );
});
