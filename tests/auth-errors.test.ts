import assert from "node:assert/strict";
import test from "node:test";
import { isAuthenticationError } from "../lib/auth-errors";

test("identifica respostas de sessão ausente ou expirada", () => {
  assert.equal(isAuthenticationError("Não autorizado."), true);
  assert.equal(isAuthenticationError("Não autenticado."), true);
  assert.equal(isAuthenticationError("  NÃO AUTORIZADO.  "), true);
});

test("não confunde erros de permissão de negócio com sessão expirada", () => {
  assert.equal(
    isAuthenticationError("Apenas corretores ou administradores podem aprovar vistorias."),
    false,
  );
  assert.equal(isAuthenticationError("Erro ao salvar a vistoria."), false);
});
