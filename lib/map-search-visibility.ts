export type MapSearchViewMode = "list" | "map";

export function shouldMountSearchMap(
  isDesktop: boolean,
  viewMode: MapSearchViewMode,
) {
  return isDesktop || viewMode === "map";
}
