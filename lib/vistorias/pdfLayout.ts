export interface PhotoGridLayout {
  columns: number;
  rows: number;
  cellWidth: number;
  cellHeight: number;
}

export interface FittedImageRect {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}

export const PHOTOS_PER_ROW = 4;
// "Visão Geral" + os dez pontos configuráveis do complemento do laudo.
export const CONDITIONS_PER_PAGE = 11;

export function getAdaptivePhotoGrid(
  photoCount: number,
  availableWidth: number,
  availableHeight: number,
  gap = 6
): PhotoGridLayout {
  if (photoCount <= 0) {
    return { columns: 0, rows: 0, cellWidth: 0, cellHeight: 0 };
  }

  const columns = PHOTOS_PER_ROW;
  const rows = Math.ceil(photoCount / columns);
  const horizontalGaps = Math.max(0, columns - 1) * gap;
  const verticalGaps = Math.max(0, rows - 1) * gap;
  const availableCellHeight = Math.max(1, (availableHeight - verticalGaps) / rows);

  return {
    columns,
    rows,
    cellWidth: Math.max(1, (availableWidth - horizontalGaps) / columns),
    cellHeight: Math.min(62, availableCellHeight),
  };
}

export function fitImageInside(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number
): FittedImageRect {
  if (sourceWidth <= 0 || sourceHeight <= 0 || targetWidth <= 0 || targetHeight <= 0) {
    return { width: 0, height: 0, offsetX: 0, offsetY: 0 };
  }

  const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;

  return {
    width,
    height,
    offsetX: (targetWidth - width) / 2,
    offsetY: (targetHeight - height) / 2,
  };
}
