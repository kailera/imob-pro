"use client";

import { useOfflineSync } from "@/hooks/useOfflineSync";

export default function OfflineSyncInit() {
  useOfflineSync();
  return null;
}
