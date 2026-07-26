import test from "node:test";
import assert from "node:assert/strict";
import {
  parseLeaseAttachments,
  parseLeaseAttachmentsFormValue,
  serializeLeaseAttachments,
} from "../lib/locacao/anexos";

test("mantém compatibilidade com uma URL legada de documento", () => {
  const attachments = parseLeaseAttachments("https://arquivos.exemplo.test/carne-iptu.pdf");
  assert.equal(attachments.length, 1);
  assert.equal(attachments[0].title, "Documento");
  assert.equal(attachments[0].fileName, "carne-iptu.pdf");
});

test("serializa título, arquivo e chave de armazenamento", () => {
  const value = serializeLeaseAttachments([{
    id: "anexo-1",
    title: "Carnê IPTU 2026",
    fileName: "iptu.pdf",
    mimeType: "application/pdf",
    url: "https://arquivos.exemplo.test/iptu.pdf",
    storageKey: "leases/tenant/lease/iptu.pdf",
  }]);
  const attachments = parseLeaseAttachments(value);
  assert.equal(attachments[0].title, "Carnê IPTU 2026");
  assert.equal(attachments[0].storageKey, "leases/tenant/lease/iptu.pdf");
});

test("rejeita URL insegura e chave pertencente a outro contrato", () => {
  const value = JSON.stringify([
    {
      id: "inseguro",
      title: "Arquivo",
      fileName: "arquivo.pdf",
      mimeType: "application/pdf",
      url: "javascript:alert(1)",
    },
    {
      id: "outro-contrato",
      title: "Arquivo",
      fileName: "arquivo.pdf",
      mimeType: "application/pdf",
      url: "https://arquivos.exemplo.test/arquivo.pdf",
      storageKey: "leases/outro/contrato/arquivo.pdf",
    },
  ]);

  assert.deepEqual(
    parseLeaseAttachmentsFormValue(value, "leases/tenant/lease/"),
    [],
  );
});
