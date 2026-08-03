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

test("ficha administrativa de vistoria não é rota pública", async () => {
  const source = await readFile(new URL("proxy.ts", projectRoot), "utf8");

  assert.doesNotMatch(source, /"\/vistorias\/\(\[\^\/\]\+\)\(\.\*\)"/);
  assert.match(source, /segments\.length === 2 && segments\[0\] === "vistorias"/);
  assert.match(source, /isPublicRoute\(request\) \|\| isLegacyPublicInspection\(pathname\)/);
  assert.match(source, /signInUrl: "\/sign-in"/);
  assert.match(source, /signUpUrl: "\/sign-up"/);
});

test("login usa a rota incorporada ao app em vez do Account Portal", async () => {
  const layout = await readFile(new URL("app/layout.tsx", projectRoot), "utf8");
  const signInPage = await readFile(
    new URL("app/sign-in/[[...sign-in]]/page.tsx", projectRoot),
    "utf8",
  );

  assert.match(layout, /signInUrl="\/sign-in"/);
  assert.match(layout, /signInFallbackRedirectUrl="\/vistorias"/);
  assert.match(signInPage, /fallbackRedirectUrl="\/vistorias"/);
});

test("vistoria preserva rascunho antes de redirecionar para login", async () => {
  const source = await readFile(
    new URL("app/(admin)/vistorias/ficha-vistoria/[id]/page.tsx", projectRoot),
    "utf8",
  );

  assert.match(source, /await persistLocalDraft\(payload, nextStatus, true\)/);
  assert.match(source, /await enqueueLatestVistoriaUpdate\(vistoriaId, payload\)/);
  assert.match(source, /redirectToSignIn\(\)/);
});
