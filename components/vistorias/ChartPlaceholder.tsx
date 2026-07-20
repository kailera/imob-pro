"use client";

import React from "react";
import { TrendingUp, Users, Calendar, AlertCircle } from "lucide-react";

interface NaoConcluidasData {
  naoIniciada: number;
  emAndamento: number;
  aguardandoAprovacao: number;
}

interface VistoriadorData {
  nome: string;
  concluidas: number;
}

interface ChartPlaceholderProps {
  type: "nao_concluidas" | "por_vistoriador" | "por_periodo";
  title: string;
  naoConcluidasData?: NaoConcluidasData;
  porVistoriadorData?: VistoriadorData[];
  porPeriodoData?: number[];
}

export function ChartPlaceholder({
  type,
  title,
  naoConcluidasData = { naoIniciada: 12, emAndamento: 5, aguardandoAprovacao: 2 },
  porVistoriadorData = [
    { nome: "Rodrigo Silva", concluidas: 14 },
    { nome: "Mariana Costa", concluidas: 9 },
    { nome: "Gabriel Santos", concluidas: 5 },
  ],
  porPeriodoData = [5, 12, 8, 15],
}: ChartPlaceholderProps) {
  // Calculations for nao_concluidas
  const { naoIniciada, emAndamento, aguardandoAprovacao } = naoConcluidasData;
  const totalPendentes = naoIniciada + emAndamento + aguardandoAprovacao;

  const pctNaoIniciada = totalPendentes > 0 ? naoIniciada / totalPendentes : 0;
  const pctEmAndamento = totalPendentes > 0 ? emAndamento / totalPendentes : 0;
  const pctAguardando = totalPendentes > 0 ? aguardandoAprovacao / totalPendentes : 0;

  // SVG rings dash offsets
  // Outer Ring (r=40, circumference=251.2)
  const outerOffset = 251.2 * (1 - pctNaoIniciada);
  // Middle Ring (r=28, circumference=175.8)
  const middleOffset = 175.8 * (1 - pctEmAndamento);
  // Inner Ring (r=16, circumference=100.5)
  const innerOffset = 100.5 * (1 - pctAguardando);

  // Calculations for por_vistoriador
  const maxConcluidas = Math.max(...porVistoriadorData.map((v) => v.concluidas), 1);

  // Calculations for por_periodo (4 weeks line chart)
  const maxPeriodValue = Math.max(...porPeriodoData, 1);
  const getY = (val: number) => 65 - (val / maxPeriodValue) * 50;
  const y0 = getY(porPeriodoData[0] || 0);
  const y1 = getY(porPeriodoData[1] || 0);
  const y2 = getY(porPeriodoData[2] || 0);
  const y3 = getY(porPeriodoData[3] || 0);

  const linePath = `M 0 ${y0} L 100 ${y1} L 200 ${y2} L 300 ${y3}`;
  const fillPath = `M 0 ${y0} L 100 ${y1} L 200 ${y2} L 300 ${y3} L 300 80 L 0 80 Z`;

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
                {/* Outer Ring - Não Iniciada */}
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
                  strokeDashoffset={outerOffset}
                  strokeLinecap="round"
                />

                {/* Middle Ring - Em Andamento */}
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
                  strokeDashoffset={middleOffset}
                  strokeLinecap="round"
                />

                {/* Inner Ring - Aguardando Aprovação */}
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
                  strokeDashoffset={innerOffset}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-[#280003]">{totalPendentes}</span>
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
                <span className="font-semibold text-[#280003]">{naoIniciada}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F0D18A] block"></span>
                  <span className="text-gray-600">Em Andamento</span>
                </div>
                <span className="font-semibold text-[#280003]">{emAndamento}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#004777] block"></span>
                  <span className="text-gray-600">Aguard. Aprov.</span>
                </div>
                <span className="font-semibold text-[#280003]">{aguardandoAprovacao}</span>
              </div>
            </div>
          </div>
        )}

        {type === "por_vistoriador" && (
          <div className="w-full flex flex-col gap-3.5">
            {porVistoriadorData.slice(0, 3).map((item, index) => {
              const widthPct = `${Math.min(100, (item.concluidas / maxConcluidas) * 100)}%`;
              return (
                <div key={index} className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-[#280003]">{item.nome}</span>
                    <span className="font-semibold text-[#708D81]">{item.concluidas} Concluídas</span>
                  </div>
                  <div className="w-full bg-[#EEEEF3] h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#708D81] h-full rounded-full transition-all duration-500"
                      style={{ width: widthPct }}
                    ></div>
                  </div>
                </div>
              );
            })}
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
                <path d={fillPath} fill="url(#line-grad)" />

                {/* Line path */}
                <path d={linePath} fill="none" stroke="#004777" strokeWidth="2.5" strokeLinecap="round" />

                {/* Data Points */}
                <circle cx="0" cy={y0} r="3" fill="#004777" stroke="#FFFFFF" strokeWidth="1.5" />
                <circle cx="100" cy={y1} r="3" fill="#004777" stroke="#FFFFFF" strokeWidth="1.5" />
                <circle cx="200" cy={y2} r="3" fill="#004777" stroke="#FFFFFF" strokeWidth="1.5" />
                <circle cx="300" cy={y3} r="3" fill="#004777" stroke="#FFFFFF" strokeWidth="1.5" />
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
