import assert from "node:assert/strict";
import test from "node:test";
import { getVistoriaTenantNames, matchesVistoriaSearch } from "../lib/vistorias/search";

test("pesquisa nomes de inquilinos vinculados e autorizados sem acentos", () => {
  const inquilino = getVistoriaTenantNames({
    locatario: { nome: "João Gonçalves" },
    locatariosAutorizados: [
      { locatario: { nome: "João Gonçalves" } },
      { locatario: { nome: "Márcia Souza" } },
    ],
  });
  assert.equal(inquilino, "João Gonçalves, Márcia Souza");
  for (const query of ["joao", " GONCALVES ", "marcia", "MÁRCIA"]) {
    assert.equal(matchesVistoriaSearch({ inquilino }, query), true);
  }
  assert.equal(matchesVistoriaSearch({ inquilino }, "Roberto"), false);
});

test("pesquisa proprietário, vistoriador, endereço e códigos", () => {
  for (const field of ["proprietario", "vistoriador", "endereco"]) {
    assert.equal(matchesVistoriaSearch({ [field]: "José Assunção" }, "jose assuncao"), true);
    assert.equal(matchesVistoriaSearch({ [field]: "Jose Assuncao" }, "JOSÉ ASSUNÇÃO"), true);
  }
  assert.equal(matchesVistoriaSearch({ codigo: "VIS-123" }, "vis-123"), true);
  assert.equal(matchesVistoriaSearch({ imovelCodigo: "IM-456" }, "im-456"), true);
  assert.equal(matchesVistoriaSearch({}, "  "), true);
  assert.equal(getVistoriaTenantNames({}), "Não vinculado");
});
