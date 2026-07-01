"use client";

import React from "react";
import { LucideIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  status: "nao_iniciada" | "em_andamento" | "aguardando_aprovacao" | "concluida" | "contestada";
}

const colorMap = {
  nao_iniciada: {
    badge: "bg-slate-100 text-slate-700 border-slate-200/50",
    iconBg: "bg-slate-50 text-slate-500",
    border: "border-l-4 border-l-slate-400",
  },
  em_andamento: {
    badge: "bg-[#F0D18A]/15 text-[#8c6d1f] border-[#F0D18A]/30",
    iconBg: "bg-[#F0D18A]/10 text-[#8c6d1f]",
    border: "border-l-4 border-l-[#F0D18A]",
  },
  aguardando_aprovacao: {
    badge: "bg-[#004777]/10 text-[#004777] border-[#004777]/20",
    iconBg: "bg-[#004777]/5 text-[#004777]",
    border: "border-l-4 border-l-[#004777]",
  },
  concluida: {
    badge: "bg-[#708D81]/15 text-[#708D81] border-[#708D81]/30",
    iconBg: "bg-[#708D81]/10 text-[#708D81]",
    border: "border-l-4 border-l-[#708D81]",
  },
  contestada: {
    badge: "bg-red-50 text-red-700 border-red-100",
    iconBg: "bg-red-50/50 text-red-600",
    border: "border-l-4 border-l-red-500",
  },
};

export function KpiCard({ title, value, icon: Icon, status }: KpiCardProps) {
  const colors = colorMap[status];

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-[#EEEEF3] p-5 flex flex-col justify-between transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 group ${colors.border}`}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 group-hover:text-[#280003] transition-colors duration-200">
          {title}
        </span>
        <div className={`p-2 rounded-lg transition-transform duration-300 group-hover:scale-110 ${colors.iconBg}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div>
        <h3 className="text-3xl sm:text-4xl font-extrabold text-[#280003] tracking-tight mb-1">
          {value}
        </h3>
        <div className="flex items-center gap-1.5 mt-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${colors.badge}`}>
            {status === "nao_iniciada" && "Aguardando"}
            {status === "em_andamento" && "Em execução"}
            {status === "aguardando_aprovacao" && "Pendente revisão"}
            {status === "concluida" && "Finalizada"}
            {status === "contestada" && "Ajuste pendente"}
          </span>
        </div>
      </div>
    </div>
  );
}
