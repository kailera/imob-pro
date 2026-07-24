import assert from "node:assert/strict";
import test from "node:test";
import {
  canShareConditionsPageWithFinalTerm,
  fitImageInside,
  getAdaptivePhotoGrid,
} from "../lib/vistorias/pdfLayout";

test("a grade amplia lotes pequenos e limita lotes maiores a três colunas", () => {
  assert.equal(getAdaptivePhotoGrid(1, 162, 210).columns, 1);
  assert.equal(getAdaptivePhotoGrid(4, 162, 210).columns, 2);
  assert.equal(getAdaptivePhotoGrid(12, 162, 210).columns, 3);
});

test("a grade distribui as células por toda a área disponível", () => {
  const layout = getAdaptivePhotoGrid(4, 162, 210, 6);

  assert.equal(layout.rows, 2);
  assert.equal(layout.cellWidth, 78);
  assert.equal(layout.cellHeight, 102);
});

test("a imagem mantém a proporção dentro da célula", () => {
  const landscape = fitImageInside(1600, 900, 78, 96);
  const portrait = fitImageInside(900, 1600, 78, 96);

  assert.equal(landscape.width, 78);
  assert.ok(landscape.height < 78);
  assert.equal(portrait.height, 96);
  assert.ok(portrait.width < 78);
});

test("o termo final só compartilha uma página de condições quando há margem segura", () => {
  const compactConditions = Array.from({ length: 6 }, () => ({ conteudo: "Condição curta." }));

  assert.equal(
    canShareConditionsPageWithFinalTerm(compactConditions, "Termo final objetivo."),
    true
  );
  assert.equal(
    canShareConditionsPageWithFinalTerm(
      compactConditions,
      "x".repeat(1101)
    ),
    false
  );
  assert.equal(
    canShareConditionsPageWithFinalTerm(
      Array.from({ length: 7 }, () => ({ conteudo: "Condição." })),
      "Termo final."
    ),
    false
  );
});
