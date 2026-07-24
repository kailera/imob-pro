import assert from "node:assert/strict";
import test from "node:test";
import {
  CONDITIONS_PER_PAGE,
  fitImageInside,
  getAdaptivePhotoGrid,
  PHOTOS_PER_ROW,
} from "../lib/vistorias/pdfLayout";

test("a grade mantém quatro fotos por linha em qualquer quantidade", () => {
  assert.equal(PHOTOS_PER_ROW, 4);
  assert.equal(getAdaptivePhotoGrid(1, 162, 210).columns, PHOTOS_PER_ROW);
  assert.equal(getAdaptivePhotoGrid(4, 162, 210).columns, PHOTOS_PER_ROW);
  assert.equal(getAdaptivePhotoGrid(12, 162, 210).columns, PHOTOS_PER_ROW);
});

test("o complemento comporta Visão Geral e os dez pontos na mesma página", () => {
  assert.equal(CONDITIONS_PER_PAGE, 11);
});

test("doze fotos formam três linhas com cartões uniformes", () => {
  const layout = getAdaptivePhotoGrid(12, 162, 210, 6);

  assert.equal(layout.rows, 3);
  assert.equal(layout.cellWidth, 36);
  assert.equal(layout.cellHeight, 62);
});

test("a imagem mantém a proporção dentro da célula", () => {
  const landscape = fitImageInside(1600, 900, 36, 58);
  const portrait = fitImageInside(900, 1600, 36, 58);

  assert.equal(landscape.width, 36);
  assert.ok(landscape.height < 36);
  assert.ok(Math.abs(portrait.height - 58) < 0.0001);
  assert.ok(portrait.width < 36);
});
