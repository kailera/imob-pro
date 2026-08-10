import test from "node:test";
import assert from "node:assert/strict";
import { criarEstadoParaNovaEmissaoInter } from "../lib/inter-cobranca";

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
