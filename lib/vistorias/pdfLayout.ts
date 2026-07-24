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

export function getAdaptivePhotoGrid(
  photoCount: number,
  availableWidth: number,
  availableHeight: number,
  gap = 6
): PhotoGridLayout {
  if (photoCount <= 0) {
    return { columns: 0, rows: 0, cellWidth: 0, cellHeight: 0 };
  }

  const columns = photoCount === 1 ? 1 : photoCount <= 4 ? 2 : 3;
  const rows = Math.ceil(photoCount / columns);
  const horizontalGaps = Math.max(0, columns - 1) * gap;
  const verticalGaps = Math.max(0, rows - 1) * gap;

  return {
    columns,
    rows,
    cellWidth: Math.max(1, (availableWidth - horizontalGaps) / columns),
    cellHeight: Math.max(1, (availableHeight - verticalGaps) / rows),
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

export function canShareConditionsPageWithFinalTerm(
  conditions: Array<{ conteudo?: string | null }>,
  finalTermText: string
): boolean {
  if (conditions.length === 0 || conditions.length > 6) return false;

  const conditionsLength = conditions.reduce(
    (total, condition) => total + String(condition.conteudo || "").trim().length,
    0
  );
  const finalTermLength = finalTermText.trim().length;

  return conditionsLength <= 1800 && finalTermLength > 0 && finalTermLength <= 1100;
}
