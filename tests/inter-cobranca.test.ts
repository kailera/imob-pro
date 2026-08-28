import test from "node:test";
import assert from "node:assert/strict";
import {
  criarDescontoInterV3,
  criarMoraInterV3,
  extrairMensagemErroInter,
  extrairSituacaoCobrancaInter,
  sanitizarTextoPagadorInter,
} from "../lib/inter-cobranca";

test("extrai a situação da resposta aninhada da API Cobrança V3", () => {
  assert.equal(extrairSituacaoCobrancaInter({
    cobranca: { situacao: "A_RECEBER" },
    boleto: { nossoNumero: "123" },
  }), "A_RECEBER");
});

test("mantém compatibilidade com respostas antigas sem objeto cobranca", () => {
  assert.equal(extrairSituacaoCobrancaInter({ situacao: "EM_PROCESSAMENTO" }), "EM_PROCESSAMENTO");
  assert.equal(extrairSituacaoCobrancaInter({ cobranca: {} }), null);
});

test("monta bonificação fixa no contrato da API V3 do Inter", () => {
  assert.deepEqual(criarDescontoInterV3({
    valor: 100,
    tipo: "VALOR",
    diasAntesDoVencimento: 1,
  }), {
    codigo: "VALORFIXODATAINFORMADA",
    quantidadeDias: 1,
    valor: 100,
  });
});

test("monta bonificação percentual no contrato da API V3 do Inter", () => {
  assert.deepEqual(criarDescontoInterV3({
    valor: 10,
    tipo: "PERCENTUAL",
    diasAntesDoVencimento: 2,
  }), {
    codigo: "PERCENTUALDATAINFORMADA",
    quantidadeDias: 2,
    taxa: 10,
  });
});

test("usa o código de taxa mensal vigente para a mora da API V3", () => {
  assert.deepEqual(criarMoraInterV3(1), {
    codigo: "TAXAMENSAL",
    taxa: 1,
  });
  assert.equal(criarMoraInterV3(0), undefined);
});

test("prioriza as violações da API do Inter sobre o título genérico", () => {
  assert.equal(extrairMensagemErroInter({
    title: "Found violation(s) for the billing",
    detail: "Verifique os dados informados.",
    violacoes: [
      { propriedade: "pagador.cep", razao: "CEP inválido." },
      { propriedade: "pagador.nome", razao: "Tamanho máximo excedido." },
    ],
  }), "Inter rejeitou a cobrança: pagador.cep: CEP inválido.; pagador.nome: Tamanho máximo excedido.");
});

test("usa detail antes do título quando não há violações", () => {
  assert.equal(extrairMensagemErroInter({
    title: "Dados inválidos.",
    detail: "Cobrança já cadastrada.",
  }), "Cobrança já cadastrada.");
});

test("sanitiza caracteres corrompidos e limita campos do pagador", () => {
  assert.equal(sanitizarTextoPagadorInter("  João\u0000 da  Silva  ", 100), "João da Silva");
  assert.equal(sanitizarTextoPagadorInter("Rua das Flores nº 123", 15), "Rua das Flores");
});
