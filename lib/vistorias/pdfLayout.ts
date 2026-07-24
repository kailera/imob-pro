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
export const PHOTO_GRID_GAP = 4;
export const PHOTO_CARD_HEIGHT = 52;
export const ROOM_PAGE_CONTENT_HEIGHT = 250;
export const ROOM_HEADER_HEIGHT = 20;
export const ROOM_SECTION_GAP = 7;
export const PHOTO_HEADING_HEIGHT = 7;
// "Visão Geral" + os dez pontos configuráveis do complemento do laudo.
export const CONDITIONS_PER_PAGE = 11;

export interface RoomContentItem<T> {
  kind: "text" | "photo-row";
  height: number;
  payload: T;
}

export interface RoomLayoutInput<R, T> {
  room: R;
  items: RoomContentItem<T>[];
}

export interface RoomLayoutSection<R, T> {
  room: R;
  continuation: boolean;
  items: RoomContentItem<T>[];
}

export interface RoomLayoutPage<R, T> {
  sections: RoomLayoutSection<R, T>[];
  usedHeight: number;
}

export function getAdaptivePhotoGrid(
  photoCount: number,
  availableWidth: number,
  availableHeight: number,
  gap = PHOTO_GRID_GAP
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
    cellHeight: Math.min(PHOTO_CARD_HEIGHT, availableCellHeight),
  };
}

export function packRoomContentPages<R, T>(
  rooms: RoomLayoutInput<R, T>[],
  pageCapacity = ROOM_PAGE_CONTENT_HEIGHT
): RoomLayoutPage<R, T>[] {
  const pages: RoomLayoutPage<R, T>[] = [];
  let currentPage: RoomLayoutPage<R, T> | undefined;

  const createPage = () => {
    currentPage = { sections: [], usedHeight: 0 };
    pages.push(currentPage);
    return currentPage;
  };

  for (const roomInput of rooms) {
    let itemIndex = 0;
    let hasPreviousSection = false;

    while (itemIndex < roomInput.items.length) {
      const page = currentPage || createPage();
      const sectionGap = page.sections.length > 0 ? ROOM_SECTION_GAP : 0;
      const firstItem = roomInput.items[itemIndex];
      const firstPhotoHeading = firstItem.kind === "photo-row" ? PHOTO_HEADING_HEIGHT : 0;
      const minimumSectionHeight =
        sectionGap + ROOM_HEADER_HEIGHT + firstPhotoHeading + firstItem.height;

      if (page.sections.length > 0 && page.usedHeight + minimumSectionHeight > pageCapacity) {
        createPage();
        continue;
      }

      const section: RoomLayoutSection<R, T> = {
        room: roomInput.room,
        continuation: hasPreviousSection,
        items: [],
      };
      page.sections.push(section);
      page.usedHeight += sectionGap + ROOM_HEADER_HEIGHT;

      let hasPhotoHeading = false;
      while (itemIndex < roomInput.items.length) {
        const item = roomInput.items[itemIndex];
        const headingHeight =
          item.kind === "photo-row" && !hasPhotoHeading ? PHOTO_HEADING_HEIGHT : 0;
        const requiredHeight = headingHeight + item.height;

        if (section.items.length > 0 && page.usedHeight + requiredHeight > pageCapacity) {
          break;
        }

        if (section.items.length === 0 && page.usedHeight + requiredHeight > pageCapacity) {
          // Os textos são fracionados antes desta etapa. A proteção evita um
          // ciclo infinito caso um bloco excepcional ainda exceda a página.
          page.usedHeight = pageCapacity;
        } else {
          page.usedHeight += requiredHeight;
        }
        section.items.push(item);
        hasPhotoHeading ||= item.kind === "photo-row";
        itemIndex += 1;
      }

      hasPreviousSection = itemIndex < roomInput.items.length || hasPreviousSection;
      if (itemIndex < roomInput.items.length) {
        createPage();
      }
    }
  }

  return pages;
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
