import assert from "node:assert/strict";
import test from "node:test";
import {
  CONDITIONS_PER_PAGE,
  fitImageInside,
  getAdaptivePhotoGrid,
  packRoomContentPages,
  PHOTO_CARD_HEIGHT,
  PHOTO_GRID_GAP,
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
  const layout = getAdaptivePhotoGrid(12, 162, 210, PHOTO_GRID_GAP);

  assert.equal(layout.rows, 3);
  assert.equal(layout.cellWidth, 37.5);
  assert.equal(layout.cellHeight, PHOTO_CARD_HEIGHT);
});

test("a imagem mantém a proporção dentro da célula", () => {
  const landscape = fitImageInside(1600, 900, 36, 58);
  const portrait = fitImageInside(900, 1600, 36, 58);

  assert.equal(landscape.width, 36);
  assert.ok(landscape.height < 36);
  assert.ok(Math.abs(portrait.height - 58) < 0.0001);
  assert.ok(portrait.width < 36);
});

test("o ambiente seguinte aproveita o espaço restante da mesma página", () => {
  const pages = packRoomContentPages(
    [
      { room: "Fachada", items: [{ kind: "photo-row" as const, height: 56, payload: "fotos" }] },
      { room: "Garagem", items: [{ kind: "text" as const, height: 70, payload: "texto" }] },
    ],
    180
  );

  assert.equal(pages.length, 1);
  assert.deepEqual(pages[0].sections.map((section) => section.room), ["Fachada", "Garagem"]);
});

test("a continuação usa a página seguinte sem reservar uma folha inteira ao ambiente", () => {
  const pages = packRoomContentPages(
    [
      {
        room: "Área de serviço",
        items: [
          { kind: "text" as const, height: 70, payload: "texto" },
          { kind: "photo-row" as const, height: 56, payload: "fotos 1" },
          { kind: "photo-row" as const, height: 56, payload: "fotos 2" },
        ],
      },
      { room: "Corredor", items: [{ kind: "text" as const, height: 45, payload: "texto" }] },
    ],
    170
  );

  assert.equal(pages.length, 2);
  assert.equal(pages[1].sections[0].room, "Área de serviço");
  assert.equal(pages[1].sections[0].continuation, true);
  assert.equal(pages[1].sections[1].room, "Corredor");
});
