import assert from "node:assert/strict";
import test from "node:test";
import { contratoPropertySchema } from "../app/(admin)/locacao/schemas/property.schema";

const enderecoValido = {
  tipo: "CASA",
  cep: "15385-266",
  logradouro: "Passeio Icaraí",
  numero: "214",
  complemento: "Casa",
  bairro: "Zona Norte",
  cidade: "Ilha Solteira",
  estado: "SP",
};

test("permite cadastrar imóvel novo sem propertyId", () => {
  const resultado = contratoPropertySchema.safeParse({
    ...enderecoValido,
    propertyId: "",
  });
  assert.equal(resultado.success, true);
  if (resultado.success) assert.equal(resultado.data.propertyId, undefined);
});

test("continua aceitando a seleção de imóvel existente", () => {
  const resultado = contratoPropertySchema.safeParse({
    ...enderecoValido,
    propertyId: "imovel-existente",
  });
  assert.equal(resultado.success, true);
  if (resultado.success) assert.equal(resultado.data.propertyId, "imovel-existente");
});
