"use client";

import React, { useState, useEffect } from "react";
import { WifiOff, Wifi } from "lucide-react";

export default function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);

  useEffect(() => {
    // Inicializa o status atual do navegador
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);

      const handleOnline = () => {
        setIsOnline(true);
        setShowSyncSuccess(true);
        // Oculta a mensagem de sucesso após 3 segundos
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
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F0D18A]/20 border border-[#F0D18A] text-[#8c6d1f] rounded-lg text-xs font-semibold animate-pulse shadow-sm">
        <WifiOff className="w-3.5 h-3.5" />
        <span>Modo Vistoria Offline (Salvando Localmente)</span>
      </div>
    );
  }

  if (showSyncSuccess) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#708D81]/20 border border-[#708D81] text-[#2c4e40] rounded-lg text-xs font-semibold animate-bounce shadow-sm">
        <Wifi className="w-3.5 h-3.5" />
        <span>Conexão restaurada e sincronizada</span>
      </div>
    );
  }

  // Quando online, podemos mostrar um indicador discreto ou nada
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#708D81]/10 border border-[#708D81]/20 text-[#708D81] rounded-lg text-xs font-semibold shadow-sm">
      <span className="w-1.5 h-1.5 rounded-full bg-[#708D81] animate-ping" />
      <span>Online</span>
    </div>
  );
}
