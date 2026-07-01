"use client";

import { useState } from "react";
import { Info, CheckCircle2, Lock, HelpCircle } from "lucide-react";

export interface LotInfo {
  id: string;
  codigo: string;
  quadra: string;
  loteNumero: string;
  area: number;
  topografia: string;
  valorVenda: number;
  statusLote: "DISPONIVEL" | "RESERVADO" | "VENDIDO";
}

interface SubdivisionMapProps {
  lots: LotInfo[];
  selectedLotId?: string;
  onSelectLot: (lot: LotInfo) => void;
}

export function SubdivisionMap({ lots, selectedLotId, onSelectLot }: SubdivisionMapProps) {
  const [hoveredLot, setHoveredLot] = useState<LotInfo | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Agrupar lotes para estatísticas rápidas
  const total = lots.length;
  const disponiveis = lots.filter(l => l.statusLote === "DISPONIVEL").length;
  const reservados = lots.filter(l => l.statusLote === "RESERVADO").length;
  const vendidos = lots.filter(l => l.statusLote === "VENDIDO").length;

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    // Posicionar o tooltip levemente acima e à direita do cursor
    setTooltipPos({
      x: e.clientX - rect.left + 15,
      y: e.clientY - rect.top - 100,
    });
  };

  const getStatusColor = (status: LotInfo["statusLote"]) => {
    switch (status) {
      case "DISPONIVEL":
        return "fill-brand-primary/15 stroke-brand-primary hover:fill-brand-primary/30";
      case "RESERVADO":
        return "fill-brand-accent-gold/20 stroke-brand-accent-gold/90 hover:fill-brand-accent-gold/40";
      case "VENDIDO":
        return "fill-zinc-200 stroke-zinc-400 opacity-60 cursor-not-allowed";
    }
  };

  const getStatusBorderClass = (status: LotInfo["statusLote"]) => {
    switch (status) {
      case "DISPONIVEL":
        return "border-brand-primary bg-brand-primary/10 text-brand-primary";
      case "RESERVADO":
        return "border-brand-accent-gold bg-brand-accent-gold/10 text-brand-text";
      case "VENDIDO":
        return "border-zinc-400 bg-zinc-100 text-zinc-500";
    }
  };

  const getStatusLabel = (status: LotInfo["statusLote"]) => {
    switch (status) {
      case "DISPONIVEL":
        return "Disponível";
      case "RESERVADO":
        return "Reservado";
      case "VENDIDO":
        return "Vendido";
    }
  };

  return (
    <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 md:p-8 shadow-md space-y-6 relative overflow-hidden">
      {/* Header and Statistics */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-brand-text flex items-center gap-2">
            <Info className="w-5 h-5 text-brand-primary" />
            Mapa Interativo do Loteamento
          </h3>
          <p className="text-xs md:text-sm text-brand-text/60">
            Passe o mouse para ver os detalhes de cada lote e clique para simular o financiamento.
          </p>
        </div>

        {/* Legend / Metrics */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-bg-primary/50 text-xs font-semibold text-brand-text">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-primary"></span>
            <span>{disponiveis} Livres</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-bg-primary/50 text-xs font-semibold text-brand-text">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-accent-gold"></span>
            <span>{reservados} Reservados</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-bg-primary/50 text-xs font-semibold text-brand-text">
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-400"></span>
            <span>{vendidos} Vendidos</span>
          </div>
          <div className="text-xs font-bold text-brand-primary">
            Progresso de Vendas: {Math.round((vendidos / total) * 100)}%
          </div>
        </div>
      </div>

      {/* SVG Container */}
      <div 
        className="relative w-full overflow-x-auto bg-brand-bg-primary/20 rounded-xl p-4 border border-zinc-100/80 cursor-crosshair min-w-[700px] select-none"
        onMouseMove={handleMouseMove}
      >
        <svg 
          viewBox="0 0 850 450" 
          className="w-full h-auto max-h-[400px]"
        >
          {/* Asfalto / Ruas */}
          {/* Rua Principal */}
          <rect x="20" y="170" width="810" height="60" rx="4" fill="#cbd5e1" opacity="0.4" />
          <line x1="20" y1="200" x2="830" y2="200" stroke="#94a3b8" strokeWidth="2" strokeDasharray="8 6" />
          <text x="425" y="205" textAnchor="middle" fill="#475569" className="text-[11px] font-bold uppercase tracking-wider">Avenida das Palmeiras</text>

          {/* Rua Lateral */}
          <rect x="420" y="20" width="60" height="410" rx="4" fill="#cbd5e1" opacity="0.4" />
          <line x1="450" y1="20" x2="450" y2="430" stroke="#94a3b8" strokeWidth="2" strokeDasharray="8 6" />
          <text x="455" y="380" transform="rotate(-90 455 380)" textAnchor="middle" fill="#475569" className="text-[11px] font-bold uppercase tracking-wider">Rua dos Ipês</text>

          {/* Renderização dos Lotes */}
          {lots.map((lot) => {
            // Mapeamento de coordenadas fictícias para os lotes no SVG
            // Quadra A: Lotes 1 a 6 (x: 50 a 350, y: 50, w: 55, h: 100)
            // Quadra B: Lotes 1 a 6 (x: 50 a 350, y: 250, w: 55, h: 100)
            // Quadra C: Lotes 1 a 5 (x: 500 a 780, y: 50, w: 60, h: 100)
            // Quadra D: Lotes 1 a 5 (x: 500 a 780, y: 250, w: 60, h: 100)
            
            let x = 0;
            let y = 0;
            let width = 55;
            let height = 100;
            const idx = parseInt(lot.loteNumero) - 1;

            if (lot.quadra === "A") {
              x = 40 + idx * 60;
              y = 50;
            } else if (lot.quadra === "B") {
              x = 40 + idx * 60;
              y = 250;
            } else if (lot.quadra === "C") {
              x = 500 + idx * 65;
              y = 50;
              width = 60;
            } else if (lot.quadra === "D") {
              x = 500 + idx * 65;
              y = 250;
              width = 60;
            }

            const isSelected = selectedLotId === lot.id;
            const isHovered = hoveredLot?.id === lot.id;
            
            return (
              <g 
                key={lot.id}
                onClick={() => lot.statusLote !== "VENDIDO" && onSelectLot(lot)}
                onMouseEnter={() => setHoveredLot(lot)}
                onMouseLeave={() => setHoveredLot(null)}
                className={`transition-all duration-200 ${lot.statusLote !== "VENDIDO" ? "cursor-pointer" : "cursor-not-allowed"}`}
              >
                {/* Lote Retângulo */}
                <rect
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  rx="6"
                  className={`transition-all duration-300 stroke-[2] ${getStatusColor(lot.statusLote)} ${
                    isSelected ? "fill-brand-primary/40 stroke-brand-primary stroke-[3.5] filter drop-shadow-md" : ""
                  } ${isHovered && lot.statusLote !== "VENDIDO" ? "filter drop-shadow-sm" : ""}`}
                />

                {/* Texto Lote (Número) */}
                <text
                  x={x + width / 2}
                  y={y + height / 2 - 5}
                  textAnchor="middle"
                  className={`text-xs font-extrabold select-none transition-colors ${
                    isSelected ? "fill-brand-primary" : "fill-brand-text"
                  } ${lot.statusLote === "VENDIDO" ? "fill-zinc-400 font-normal" : ""}`}
                >
                  {lot.quadra}-{lot.loteNumero}
                </text>

                {/* Texto Área */}
                <text
                  x={x + width / 2}
                  y={y + height / 2 + 15}
                  textAnchor="middle"
                  className={`text-[9px] font-semibold select-none ${
                    lot.statusLote === "VENDIDO" ? "fill-zinc-400/80" : "fill-brand-text/60"
                  }`}
                >
                  {lot.area}m²
                </text>

                {/* Ícone de Vendido/Bloqueado */}
                {lot.statusLote === "VENDIDO" && (
                  <circle
                    cx={x + width / 2}
                    cy={y + height - 18}
                    r="6"
                    className="fill-zinc-300 stroke-zinc-400 stroke-[1]"
                  />
                )}
                {lot.statusLote === "VENDIDO" && (
                  <text
                    x={x + width / 2}
                    y={y + height - 15}
                    textAnchor="middle"
                    className="text-[8px] fill-zinc-600 font-bold select-none"
                  >
                    ✖
                  </text>
                )}

                {/* Indicador de Selecionado */}
                {isSelected && (
                  <circle
                    cx={x + width / 2}
                    cy={y + 12}
                    r="5"
                    className="fill-brand-primary animate-pulse"
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip (Absolute relative to SVG container) */}
        {hoveredLot && (
          <div 
            className="absolute z-30 bg-brand-text text-white p-4 rounded-xl shadow-2xl border border-white/10 pointer-events-none transition-opacity duration-150 flex flex-col gap-1.5 w-60"
            style={{ 
              left: `${tooltipPos.x}px`, 
              top: `${tooltipPos.y}px` 
            }}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
              <span className="font-extrabold text-sm text-brand-accent-gold">
                Quadra {hoveredLot.quadra} — Lote {hoveredLot.loteNumero}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBorderClass(hoveredLot.statusLote)}`}>
                {getStatusLabel(hoveredLot.statusLote)}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div>
                <span className="text-white/50 block text-[10px] uppercase font-semibold">Tamanho</span>
                <span className="font-bold text-white">{hoveredLot.area} m²</span>
              </div>
              <div>
                <span className="text-white/50 block text-[10px] uppercase font-semibold">Topografia</span>
                <span className="font-bold text-white capitalize">{hoveredLot.topografia.toLowerCase()}</span>
              </div>
            </div>

            {hoveredLot.statusLote !== "VENDIDO" && (
              <div className="pt-1.5 border-t border-white/10">
                <span className="text-white/50 block text-[10px] uppercase font-semibold">Valor Especial</span>
                <span className="font-extrabold text-brand-accent-gold text-base">
                  R$ {hoveredLot.valorVenda.toLocaleString("pt-BR")}
                </span>
                <span className="text-[9px] text-brand-accent-green block font-medium">
                  Entrada + parcelas a partir de R$ {(hoveredLot.valorVenda * 0.007).toLocaleString("pt-BR", {maximumFractionDigits: 0})}/mês
                </span>
              </div>
            )}
            
            {hoveredLot.statusLote === "VENDIDO" && (
              <div className="text-[10px] text-zinc-400 italic pt-1 text-center">
                Unidade vendida e não disponível.
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Small Help Prompt */}
      <div className="bg-brand-bg-primary/40 rounded-xl p-4 flex gap-3 items-start border border-brand-bg-primary/30">
        <HelpCircle className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
        <div className="text-xs md:text-sm text-brand-text/80 leading-relaxed">
          <span className="font-bold text-brand-text">Como funciona a reserva:</span> Escolha um dos lotes coloridos em azul ou amarelo no mapa acima para ver seus detalhes e carregar os dados dele diretamente no **Simulador de Pagamento** abaixo. Lotes cinzas marcados com ✖ já foram adquiridos e estão em fase de escrituração.
        </div>
      </div>
    </div>
  );
}
