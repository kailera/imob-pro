import test from "node:test";
import assert from "node:assert/strict";
import { InterTokenCache } from "../lib/inter-token-cache";

test("reutiliza o token enquanto ele permanece válido", async () => {
  let now = 1_000;
  let calls = 0;
  const cache = new InterTokenCache(() => now, 0);
  const load = async () => {
    calls += 1;
    return { token: `token-${calls}`, expiresInSeconds: 60 };
  };

  assert.equal(await cache.get("app", load), "token-1");
  now += 30_000;
  assert.equal(await cache.get("app", load), "token-1");
  assert.equal(calls, 1);
});

test("consolida solicitações simultâneas do mesmo token", async () => {
  let calls = 0;
  const cache = new InterTokenCache(Date.now, 0);
  const load = async () => {
    calls += 1;
    await new Promise(resolve => setTimeout(resolve, 10));
    return { token: "compartilhado", expiresInSeconds: 60 };
  };

  const tokens = await Promise.all([
    cache.get("app", load),
    cache.get("app", load),
    cache.get("app", load),
  ]);

  assert.deepEqual(tokens, ["compartilhado", "compartilhado", "compartilhado"]);
  assert.equal(calls, 1);
});

test("renova o token depois do prazo útil", async () => {
  let now = 1_000;
  let calls = 0;
  const cache = new InterTokenCache(() => now, 0);
  const load = async () => {
    calls += 1;
    return { token: `token-${calls}`, expiresInSeconds: 60 };
  };

  assert.equal(await cache.get("app", load), "token-1");
  now += 60_001;
  assert.equal(await cache.get("app", load), "token-2");
  assert.equal(calls, 2);
});
