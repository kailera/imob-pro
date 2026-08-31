import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  cancelarBoletoInter,
  respostaInterIndicaCobrancaCancelada,
} from "../lib/inter-cobranca";

const readSource = (relativePath: string) => readFileSync(
  fileURLToPath(new URL(relativePath, import.meta.url)),
  "utf8",
);

test("envia o cancelamento no endpoint V3 com o payload documentado", async () => {
  const calls: Array<{ url: string; data: unknown; config: unknown }> = [];

  await cancelarBoletoInter({
    baseUrl: "https://cdpj-sandbox.partners.uatinter.co/",
    codigoSolicitacao: "497f6eca-6276-4993-bfeb-53cbbbba6f08",
    accessToken: "token-de-teste",
    httpsAgent: {} as never,
    motivoCancelamento: "Boleto emitido em duplicidade",
  }, async (url, data, config) => {
    calls.push({ url, data, config });
    return {} as never;
  });

  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].url,
    "https://cdpj-sandbox.partners.uatinter.co/cobranca/v3/cobrancas/497f6eca-6276-4993-bfeb-53cbbbba6f08/cancelar",
  );
  assert.deepEqual(calls[0].data, {
    motivoCancelamento: "Boleto emitido em duplicidade",
  });
  assert.deepEqual((calls[0].config as { headers: unknown }).headers, {
    Authorization: "Bearer token-de-teste",
    "Content-Type": "application/json",
  });
});

test("valida o limite de 50 caracteres do motivo de cancelamento", async () => {
  await assert.rejects(
    cancelarBoletoInter({
      baseUrl: "https://cdpj.partners.bancointer.com.br",
      codigoSolicitacao: "497f6eca-6276-4993-bfeb-53cbbbba6f08",
      accessToken: "token-de-teste",
      httpsAgent: {} as never,
      motivoCancelamento: "x".repeat(51),
    }),
    /entre 1 e 50 caracteres/,
  );
});

test("considera sucesso quando o Inter informa que a cobrança já está cancelada", () => {
  assert.equal(respostaInterIndicaCobrancaCancelada({
    title: "Requisição inválida",
    detail: "A cobrança não pode ser cancelada, pois se encontra na situação CANCELADO.",
  }), true);
});

test("não ignora outros erros de cancelamento do Inter", () => {
  assert.equal(respostaInterIndicaCobrancaCancelada({
    title: "Requisição inválida",
    detail: "A cobrança já foi recebida.",
  }), false);
});

test("integração Inter é global e não depende do imobId da cobrança", () => {
  const schema = readSource("../prisma/schema.prisma");
  const interService = readSource("../lib/inter.ts");
  const migration = readSource(
    "../prisma/migrations/20260831183000_make_inter_config_global/migration.sql",
  );
  const configModel = schema.slice(
    schema.indexOf("model ConfiguracaoInter"),
    schema.indexOf("enum TipoNegocioComissao"),
  );

  assert.match(configModel, /singletonKey\s+String\s+@unique\s+@default\("global"\)/);
  assert.doesNotMatch(configModel, /imobId/);
  assert.match(interService, /where: \{ singletonKey: "global" \}/);
  assert.match(interService, /export async function getInterCredentials\(\)/);
  assert.match(migration, /ORDER BY "updatedAt" DESC/);
  assert.match(migration, /DROP COLUMN "imobId"/);
});

test("cancelamento valida acesso e só então chama o serviço do Inter", () => {
  const actions = readSource("../app/actions/interActions.ts");
  const wrapper = actions.slice(
    actions.indexOf("export async function cancelarBolePixWrapperAction"),
    actions.indexOf("export async function consultarBolePixWrapperAction"),
  );
  const interService = readSource("../lib/inter.ts");
  const cancellation = interService.slice(
    interService.indexOf("export async function cancelarBolePixAction"),
    interService.indexOf("export async function reemitirBolePixAction"),
  );

  assert.ok(
    wrapper.indexOf("requireInterTransactionAccess")
      < wrapper.indexOf("cancelarBolePixAction(transacaoId)"),
  );
  assert.ok(
    cancellation.indexOf("await cancelarBoletoInter")
      < cancellation.indexOf("interStatus: \"CANCELADO\""),
  );
});
