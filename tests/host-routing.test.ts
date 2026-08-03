import assert from "node:assert/strict";
import test from "node:test";
import {
  isAdminHost,
  isInterWebhookHost,
  isPublicHost,
  isPublicSitePath,
  normalizeHostname,
} from "../lib/host-routing";

test("normaliza o hostname encaminhado pelo Traefik", () => {
  assert.equal(normalizeHostname("ScatolinImoveis.com.br:443"), "scatolinimoveis.com.br");
  assert.equal(normalizeHostname("imobpro.euatendo.online, proxy:3000"), "imobpro.euatendo.online");
});

test("reconhece somente os hosts de produção esperados", () => {
  assert.equal(isAdminHost("imobpro.euatendo.online"), true);
  assert.equal(isPublicHost("scatolinimoveis.com.br"), true);
  assert.equal(isPublicHost("www.scatolinimoveis.com.br"), true);
  assert.equal(isInterWebhookHost("inter-webhook.euatendo.online"), true);
  assert.equal(isPublicHost("dominio-invasor.example"), false);
});

test("site público não aceita caminhos administrativos", () => {
  assert.equal(isPublicSitePath("/"), true);
  assert.equal(isPublicSitePath("/busca"), true);
  assert.equal(isPublicSitePath("/loteamentos/novo"), true);
  assert.equal(isPublicSitePath("/vistorias/acesso/token"), true);
  assert.equal(isPublicSitePath("/vistorias/token-legado"), true);
  assert.equal(isPublicSitePath("/admin"), false);
  assert.equal(isPublicSitePath("/financeiro"), false);
  assert.equal(isPublicSitePath("/vistorias/ficha-vistoria/123"), false);
});
