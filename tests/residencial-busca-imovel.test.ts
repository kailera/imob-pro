import test from "node:test";
import assert from "node:assert/strict";
import { imovelCorrespondeABusca } from "../lib/residenciais/busca-imovel";

const imovel = {
  codigo: "IMB-CSV-00102",
  titulo: "Apartamento 12",
  endereco: "Rua Nazaré, 170 — Zona Norte, Ilha Solteira/SP",
  proprietarios: ["José Augusto Di Lollo"],
  inquilinos: ["Maria da Silva"],
};

test("encontra endereço sem exigir a pontuação exibida", () => {
  assert.equal(imovelCorrespondeABusca(imovel, "rua nazare 170"), true);
  assert.equal(imovelCorrespondeABusca(imovel, "170 ilha solteira"), true);
});

test("encontra proprietário ignorando acentos e aceitando termos separados", () => {
  assert.equal(imovelCorrespondeABusca(imovel, "jose augusto"), true);
  assert.equal(imovelCorrespondeABusca(imovel, "lollo jose"), true);
});

test("não retorna imóvel quando algum termo não corresponde", () => {
  assert.equal(imovelCorrespondeABusca(imovel, "jose campinas"), false);
});

test("encontra imóvel pelo nome do inquilino", () => {
  assert.equal(imovelCorrespondeABusca(imovel, "maria silva"), true);
});
