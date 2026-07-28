import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

test("service worker não intercepta bundles nem rotas de autenticação", async () => {
  const source = await readFile(new URL("public/sw.js", projectRoot), "utf8");

  assert.match(source, /url\.pathname\.startsWith\("\/_next\/"\)/);
  assert.match(source, /url\.pathname\.startsWith\("\/sign-in"\)/);
  assert.match(source, /url\.pathname\.startsWith\("\/sign-up"\)/);
  assert.doesNotMatch(source, /url\.pathname\.startsWith\("\/_next\/static\/"\)\s*\|\|/);
});

test("navegação offline não armazena redirecionamento de login", async () => {
  const source = await readFile(new URL("public/sw.js", projectRoot), "utf8");

  assert.match(source, /response\.ok && !response\.redirected/);
});

test("recarga por incompatibilidade de build possui cooldown", async () => {
  const source = await readFile(
    new URL("components/shared/PWAProvider.tsx", projectRoot),
    "utf8",
  );

  assert.match(source, /reloadCooldownMs = 30_000/);
  assert.match(source, /attemptedRecently/);
  assert.match(source, /updateViaCache: "none"/);
});
