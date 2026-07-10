"use client";

import React from "react";
import { LayoutGrid, FileText, ClipboardList } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

interface BottomNavigationMobileProps {
  activeTab: "planta" | "ambientes" | "relatorio";
  onChange: (tab: "planta" | "ambientes" | "relatorio") => void;
}

export function BottomNavigationMobile({ activeTab, onChange }: BottomNavigationMobileProps) {
  // Monitora a fila de sincronização em tempo real
  const pendingCount = useLiveQuery(() => db.syncQueue.count()) || 0;

  const tabs = [
    {
      id: "planta" as const,
      label: "Planta 2D",
      icon: LayoutGrid,
    },
    {
      id: "ambientes" as const,
      label: "Ambientes",
      icon: ClipboardList,
    },
    {
      id: "relatorio" as const,
      label: "Relatório",
      icon: FileText,
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#EEEEF3] shadow-[0_-2px_10px_rgba(0,0,0,0.05)] md:hidden safe-bottom">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto px-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`relative flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-bold transition-all duration-200 ${
                isActive ? "text-[#004777]" : "text-gray-400 hover:text-[#280003]/80"
              }`}
            >
              {/* Icon Container with subtle scale on active */}
              <div
                className={`p-1 rounded-xl mb-1 transition-transform duration-200 ${
                  isActive ? "scale-110 bg-[#004777]/5" : "scale-100"
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>

              <span>{tab.label}</span>

              {/* Notification Badge */}
              {tab.badge !== undefined && (
                <span className="absolute top-2.5 right-1/4 min-w-[16px] h-4 px-1 flex items-center justify-center bg-[#8c6d1f] text-white text-[9px] font-extrabold rounded-full shadow-sm animate-pulse">
                  {tab.badge}
                </span>
              )}

              {/* Active Bar Indicator */}
              {isActive && (
                <span className="absolute bottom-0 w-8 h-1 bg-[#004777] rounded-t-full transition-all duration-300" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
