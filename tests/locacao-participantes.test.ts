import assert from "node:assert/strict";
import test from "node:test";
import { addContratoPartySchema } from "../app/(admin)/locacao/schemas/party.schema";

const participanteMinimo = {
  role: "LANDLORD",
  category: "FISICA",
  name: "Proprietário Teste",
  cpfCnpj: "12345678901",
};

test("valida e normaliza os dados bancários opcionais do proprietário", () => {
  const resultado = addContratoPartySchema.parse({
    ...participanteMinimo,
    bankName: "  Banco Teste  ",
    bankAgency: " 0001-9 ",
    bankAccount: " 12345-6 ",
    pixKey: " proprietario@example.com ",
  });

  assert.equal(resultado.bankName, "Banco Teste");
  assert.equal(resultado.bankAgency, "0001-9");
  assert.equal(resultado.bankAccount, "12345-6");
  assert.equal(resultado.pixKey, "proprietario@example.com");
});

test("rejeita dados bancários acima dos limites do cadastro", () => {
  const resultado = addContratoPartySchema.safeParse({
    ...participanteMinimo,
    pixKey: "x".repeat(181),
  });

  assert.equal(resultado.success, false);
});
