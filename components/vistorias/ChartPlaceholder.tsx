"use client";

import React from "react";
import { TrendingUp, Users, Calendar, AlertCircle } from "lucide-react";

interface ChartPlaceholderProps {
  type: "nao_concluidas" | "por_vistoriador" | "por_periodo";
  title: string;
}

export function ChartPlaceholder({ type, title }: ChartPlaceholderProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#EEEEF3] p-5 flex flex-col justify-between h-[280px] transition-all duration-300 hover:shadow-md">
      {/* Chart Header */}
      <div className="flex items-center justify-between mb-4 border-b border-[#EEEEF3] pb-3">
        <h4 className="text-sm font-semibold text-[#280003] flex items-center gap-2">
          {type === "nao_concluidas" && <AlertCircle className="w-4 h-4 text-[#004777]" />}
          {type === "por_vistoriador" && <Users className="w-4 h-4 text-[#708D81]" />}
          {type === "por_periodo" && <Calendar className="w-4 h-4 text-[#004777]" />}
          {title}
        </h4>
        <span className="text-[10px] bg-[#EEEEF3] text-[#280003]/60 px-2 py-0.5 rounded-full font-medium">
          Mês Atual
        </span>
      </div>

      {/* Chart Body */}
      <div className="flex-1 flex items-center justify-center">
        {type === "nao_concluidas" && (
          <div className="w-full flex items-center justify-between gap-4 px-2">
            {/* SVG Donut/Nested Rings */}
            <div className="relative w-28 h-28 flex-shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Outer Ring - Não Iniciada (60%) */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="stroke-slate-100"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="stroke-slate-400"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray="251.2"
                  strokeDashoffset="100.48" // 60% remaining
                  strokeLinecap="round"
                />

                {/* Middle Ring - Em Andamento (25%) */}
                <circle
                  cx="50"
                  cy="50"
                  r="28"
                  className="stroke-slate-100"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="28"
                  className="stroke-[#F0D18A]"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray="175.8"
                  strokeDashoffset="131.85" // 25% remaining
                  strokeLinecap="round"
                />

                {/* Inner Ring - Aguardando Aprovação (15%) */}
                <circle
                  cx="50"
                  cy="50"
                  r="16"
                  className="stroke-slate-100"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="16"
                  className="stroke-[#004777]"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray="100.5"
                  strokeDashoffset="85.4" // 15% remaining
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-[#280003]">19</span>
                <span className="text-[8px] uppercase tracking-wider text-gray-400 font-semibold">Pendentes</span>
              </div>
            </div>

            {/* Legend */}
            <div className="flex-1 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400 block"></span>
                  <span className="text-gray-600">Não Iniciada</span>
                </div>
                <span className="font-semibold text-[#280003]">12</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F0D18A] block"></span>
                  <span className="text-gray-600">Em Andamento</span>
                </div>
                <span className="font-semibold text-[#280003]">5</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#004777] block"></span>
                  <span className="text-gray-600">Aguard. Aprov.</span>
                </div>
                <span className="font-semibold text-[#280003]">2</span>
              </div>
            </div>
          </div>
        )}

        {type === "por_vistoriador" && (
          <div className="w-full flex flex-col gap-3.5">
            {/* Inspector 1 */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-[#280003]">Rodrigo Silva</span>
                <span className="font-semibold text-[#708D81]">14 Concluídas</span>
              </div>
              <div className="w-full bg-[#EEEEF3] h-2 rounded-full overflow-hidden">
                <div className="bg-[#708D81] h-full rounded-full transition-all duration-500" style={{ width: "85%" }}></div>
              </div>
            </div>

            {/* Inspector 2 */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-[#280003]">Mariana Costa</span>
                <span className="font-semibold text-[#708D81]">9 Concluídas</span>
              </div>
              <div className="w-full bg-[#EEEEF3] h-2 rounded-full overflow-hidden">
                <div className="bg-[#708D81] h-full rounded-full transition-all duration-500" style={{ width: "55%" }}></div>
              </div>
            </div>

            {/* Inspector 3 */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-[#280003]">Gabriel Santos</span>
                <span className="font-semibold text-[#708D81]">5 Concluídas</span>
              </div>
              <div className="w-full bg-[#EEEEF3] h-2 rounded-full overflow-hidden">
                <div className="bg-[#708D81] h-full rounded-full transition-all duration-500" style={{ width: "30%" }}></div>
              </div>
            </div>
          </div>
        )}

        {type === "por_periodo" && (
          <div className="w-full flex flex-col justify-between h-full pt-2">
            {/* SVG Line Graph */}
            <div className="relative w-full h-24">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 300 80" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="line-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#004777" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#004777" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Horizontal Gridlines */}
                <line x1="0" y1="20" x2="300" y2="20" stroke="#EEEEF3" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="0" y1="50" x2="300" y2="50" stroke="#EEEEF3" strokeWidth="1" strokeDasharray="3 3" />
                
                {/* Gradient area */}
                <path d="M 0 65 Q 40 40, 80 50 T 160 25 T 240 45 T 300 15 L 300 80 L 0 80 Z" fill="url(#line-grad)" />
                
                {/* Line path */}
                <path d="M 0 65 Q 40 40, 80 50 T 160 25 T 240 45 T 300 15" fill="none" stroke="#004777" strokeWidth="2.5" strokeLinecap="round" />
                
                {/* Data Points */}
                <circle cx="80" cy="50" r="3" fill="#004777" stroke="#FFFFFF" strokeWidth="1.5" />
                <circle cx="160" cy="25" r="3" fill="#004777" stroke="#FFFFFF" strokeWidth="1.5" />
                <circle cx="240" cy="45" r="3" fill="#004777" stroke="#FFFFFF" strokeWidth="1.5" />
                <circle cx="300" cy="15" r="3" fill="#004777" stroke="#FFFFFF" strokeWidth="1.5" />
              </svg>
            </div>
            
            {/* X-Axis labels */}
            <div className="flex justify-between text-[9px] font-semibold text-gray-400 mt-2 px-1">
              <span>Semana 1</span>
              <span>Semana 2</span>
              <span>Semana 3</span>
              <span>Semana 4</span>
            </div>
          </div>
        )}
      </div>

      {/* Chart Footer */}
      <div className="border-t border-[#EEEEF3] pt-2 mt-3 flex items-center justify-between text-[10px] text-gray-500 font-medium">
        <span className="flex items-center gap-1">
          <TrendingUp className="w-3.5 h-3.5 text-[#708D81]" />
          +12% que mês anterior
        </span>
        <span className="text-[#004777] cursor-pointer hover:underline">Ver relatórios</span>
      </div>
    </div>
  );
}
