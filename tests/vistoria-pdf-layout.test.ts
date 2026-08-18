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
import { matchesRoomReference, normalizeRoomName } from "../lib/vistorias/roomMatching";
import { getOptimizedVideoUrl, getPendingVideoFileKey, normalizeInspectionMedia, replacePendingVideoUrl, replaceSyncedOfflineComment } from "../lib/vistorias/videoMedia";
import { formatInspectionDate, getSaoPauloDateInputValue, parseInspectionDate } from "../lib/vistorias/dates";

test("mantém a data civil da vistoria sem recuar um dia no Brasil", () => {
  assert.equal(formatInspectionDate("2026-08-18"), "18/08/2026");
  assert.equal(formatInspectionDate("2026-08-18T00:00:00.000Z"), "18/08/2026");
  assert.equal(parseInspectionDate("2026-08-18").toISOString(), "2026-08-18T12:00:00.000Z");
  assert.equal(getSaoPauloDateInputValue(new Date("2026-08-19T01:30:00.000Z")), "2026-08-18");
});

test("normaliza mídias antigas e reconhece vídeo pelo tipo ou extensão", () => {
  assert.deepEqual(normalizeInspectionMedia([
    { url: "https://storage/comments/foto.jpg", tipo: "IMAGEM" },
    { url: "https://storage/comments/video.mov", tipo: "IMAGEM" },
    { url: "https://storage/comments/outro", tipo: "VIDEO" },
  ]).map((item) => item.type), ["image", "video", "video"]);
});

test("troca URLs blob pela mídia definitiva após sincronizar comentário offline", () => {
  const comments = replaceSyncedOfflineComment([{
    id: "temp-123",
    roomId: "garagem",
    texto: "Foto",
    midias: [{ url: "blob:https://app/temporaria", type: "image", offlineId: "offline-1" }],
    media: [{ url: "blob:https://app/legada", type: "image" }],
  }], {
    tempCommentId: "temp-123",
    roomId: "garagem",
    text: "Foto",
    serverCommentId: "comment-456",
    createdAt: "2026-08-18T18:00:00.000Z",
    media: [{ url: "https://storage/comments/foto.jpg", type: "image" }],
  }) as Array<Record<string, unknown>>;

  assert.equal(comments[0].id, "comment-456");
  assert.deepEqual(comments[0].midias, [{ url: "https://storage/comments/foto.jpg", type: "image" }]);
  assert.equal("media" in comments[0], false);
});

test("a URL temporária de vídeo aponta para o MP4 otimizado", () => {
  const temporaryUrl = "https://storage.exemplo/bucket/comments/temp/abc-123.mov";

  assert.equal(getPendingVideoFileKey(temporaryUrl), "comments/temp/abc-123.mov");
  assert.equal(getOptimizedVideoUrl(temporaryUrl), "https://storage.exemplo/bucket/comments/abc-123.mp4");
});

test("a compactação substitui a URL no JSON do comentário", () => {
  const replacement = replacePendingVideoUrl(
    [{ url: "https://storage/bucket/comments/temp/abc.webm", type: "video", nome: "vistoria.webm" }],
    "comments/temp/abc.webm",
    "https://storage/bucket/comments/abc.mp4"
  );

  assert.equal(replacement.updated, true);
  assert.equal(replacement.media[0].url, "https://storage/bucket/comments/abc.mp4");
  assert.equal(replacement.media[0].nome, "vistoria.webm");
});

test("fotos legadas continuam vinculadas ao ambiente pelo nome", () => {
  const currentRoomIds = new Set(["uuid-garagem", "uuid-sala"]);

  assert.equal(
    matchesRoomReference(
      ["uuid-garagem"],
      "Garagem",
      { roomId: "id-antigo", roomName: "  GARÁGEM " },
      currentRoomIds
    ),
    true
  );
  assert.equal(normalizeRoomName("Quarto  Suíte"), "quarto suite");
});

test("o nome não sobrepõe um vínculo válido com outro ambiente", () => {
  const currentRoomIds = new Set(["uuid-garagem-1", "uuid-garagem-2"]);

  assert.equal(
    matchesRoomReference(
      ["uuid-garagem-1"],
      "Garagem",
      { roomId: "uuid-garagem-2", roomName: "Garagem" },
      currentRoomIds
    ),
    false
  );
});

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
