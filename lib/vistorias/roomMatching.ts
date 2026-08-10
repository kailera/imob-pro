export interface RoomReference {
  roomId?: string | null;
  roomName?: string | null;
}

export function normalizeRoomName(value: string | null | undefined): string {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR");
}

/**
 * IDs are the canonical link. The room name is used only for legacy comments
 * whose room ID no longer exists in the current inspection.
 */
export function matchesRoomReference(
  sourceRoomIds: readonly string[],
  roomName: string,
  reference: RoomReference,
  currentRoomIds: ReadonlySet<string>
): boolean {
  const referenceRoomId = reference.roomId || "";

  if (sourceRoomIds.includes(referenceRoomId)) return true;
  if (referenceRoomId && currentRoomIds.has(referenceRoomId)) return false;

  const normalizedReferenceName = normalizeRoomName(reference.roomName);
  return Boolean(normalizedReferenceName) && normalizedReferenceName === normalizeRoomName(roomName);
}
