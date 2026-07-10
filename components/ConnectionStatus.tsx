"use client";

import React, { useState, useEffect } from "react";
import { WifiOff, Wifi, CloudUpload, Cloud, RefreshCw } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

export default function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);

  // Monitora alterações pendentes no IndexedDB
  const pendingCount = useLiveQuery(() => db.syncQueue.count()) || 0;

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);

      const handleOnline = () => {
        setIsOnline(true);
        setShowSyncSuccess(true);
        const timer = setTimeout(() => {
          setShowSyncSuccess(false);
        }, 3000);
        return () => clearTimeout(timer);
      };

      const handleOffline = () => {
        setIsOnline(false);
        setShowSyncSuccess(false);
      };

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  if (!isOnline) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F0D18A]/20 border border-[#F0D18A] text-[#8c6d1f] rounded-lg text-xs font-semibold shadow-sm animate-pulse">
        <WifiOff className="w-3.5 h-3.5" />
        <span>
          Offline ({pendingCount > 0 ? `${pendingCount} pendente(s)` : "Modo Vistoria"})
        </span>
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#004777]/10 border border-[#004777]/30 text-[#004777] rounded-lg text-xs font-semibold shadow-sm">
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        <span>Sincronizando {pendingCount}...</span>
      </div>
    );
  }

  if (showSyncSuccess) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#708D81]/20 border border-[#708D81] text-[#2c4e40] rounded-lg text-xs font-semibold animate-bounce shadow-sm">
        <Wifi className="w-3.5 h-3.5" />
        <span>Tudo sincronizado!</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#708D81]/10 border border-[#708D81]/20 text-[#708D81] rounded-lg text-xs font-semibold shadow-sm">
      <Cloud className="w-3.5 h-3.5 text-[#708D81]" />
      <span>Online</span>
    </div>
  );
}
