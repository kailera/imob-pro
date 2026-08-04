import assert from "node:assert/strict";
import test from "node:test";
import { shouldMountSearchMap } from "../lib/map-search-visibility";

test("não monta o mapa oculto enquanto o celular está no modo lista", () => {
  assert.equal(shouldMountSearchMap(false, "list"), false);
});

test("monta o mapa ao abrir o modo mapa no celular", () => {
  assert.equal(shouldMountSearchMap(false, "map"), true);
});

test("mantém o mapa montado no desktop", () => {
  assert.equal(shouldMountSearchMap(true, "list"), true);
  assert.equal(shouldMountSearchMap(true, "map"), true);
});
