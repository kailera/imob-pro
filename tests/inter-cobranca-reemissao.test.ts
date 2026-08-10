import test from "node:test";
import assert from "node:assert/strict";
import {
  criarEstadoParaNovaEmissaoInter,
  criarMetadataNovaEmissaoInter,
  criarSeuNumeroInter,
} from "../lib/inter-cobranca";

test("limpa todos os identificadores do Inter antes de uma nova emissão", () => {
  assert.deepEqual(criarEstadoParaNovaEmissaoInter(), {
    interNossoNumero: null,
    interCodigoSolicitacao: null,
    interSeuNumero: null,
    interTxId: null,
    interPixCode: null,
    interBarcode: null,
    interPdfKey: null,
    interStatus: null,
    interOrigemRecebimento: null,
    interDataRecebimento: null,
    interValorRecebido: null,
    interMensagem: {},
    status: "PENDENTE",
  });
});

test("gera um novo seuNumero de até 15 caracteres a cada reemissão", () => {
  const initialMetadata = { origin: "MANUAL_AGREEMENT" };
  const firstReissue = criarMetadataNovaEmissaoInter(initialMetadata);
  const secondReissue = criarMetadataNovaEmissaoInter(firstReissue);

  assert.equal(criarSeuNumeroInter("12345678-1234-1234-1234-123456789012", initialMetadata), "123456781234123");
  assert.equal(criarSeuNumeroInter("12345678-1234-1234-1234-123456789012", firstReissue), "123456781230001");
  assert.equal(criarSeuNumeroInter("12345678-1234-1234-1234-123456789012", secondReissue), "123456781230002");
});
