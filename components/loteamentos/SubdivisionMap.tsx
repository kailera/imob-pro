"use client";

import { useState } from "react";
import { Info, HelpCircle, Loader2, X, AlertCircle } from "lucide-react";

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
  onSelectLot?: (lot: LotInfo) => void;
  mode?: "public" | "edit";
  onLotStatusChange?: (lotId: string, status: "DISPONIVEL" | "RESERVADO" | "VENDIDO") => Promise<void>;
}

export function SubdivisionMap({ 
  lots, 
  selectedLotId, 
  onSelectLot, 
  mode = "public", 
  onLotStatusChange 
}: SubdivisionMapProps) {
  const [hoveredLot, setHoveredLot] = useState<LotInfo | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [editingLot, setEditingLot] = useState<LotInfo | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Group stats
  const total = lots.length;
  const disponiveis = lots.filter(l => l.statusLote === "DISPONIVEL").length;
  const reservados = lots.filter(l => l.statusLote === "RESERVADO").length;
  const vendidos = lots.filter(l => l.statusLote === "VENDIDO").length;

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({
      x: e.clientX - rect.left + 15,
      y: e.clientY - rect.top - 120,
    });
  };

  const getStatusColor = (status: LotInfo["statusLote"]) => {
    switch (status) {
      case "DISPONIVEL":
        return "fill-sky-50/70 stroke-sky-500 hover:fill-sky-100/80";
      case "RESERVADO":
        return "fill-amber-50/70 stroke-amber-500 hover:fill-amber-100/80";
      case "VENDIDO":
        // Red color as requested for occupied lots
        return "fill-rose-50/70 stroke-rose-500 hover:fill-rose-100/80";
    }
  };

  const getStatusBorderClass = (status: LotInfo["statusLote"]) => {
    switch (status) {
      case "DISPONIVEL":
        return "border-sky-500 bg-sky-50 text-sky-600";
      case "RESERVADO":
        return "border-amber-500 bg-amber-50 text-amber-600";
      case "VENDIDO":
        return "border-rose-500 bg-rose-50 text-rose-600";
    }
  };

  const getStatusLabel = (status: LotInfo["statusLote"]) => {
    switch (status) {
      case "DISPONIVEL":
        return "Disponível";
      case "RESERVADO":
        return "Reservado";
      case "VENDIDO":
        return "Ocupado";
    }
  };

  const handleLotClick = (lot: LotInfo) => {
    if (mode === "edit") {
      setUpdateError(null);
      setEditingLot(lot);
    } else {
      if (lot.statusLote !== "VENDIDO") {
        onSelectLot?.(lot);
      }
    }
  };

  const handleStatusChange = async (newStatus: "DISPONIVEL" | "RESERVADO" | "VENDIDO") => {
    if (!editingLot || !onLotStatusChange) return;
    setIsUpdating(true);
    setUpdateError(null);
    try {
      await onLotStatusChange(editingLot.id, newStatus);
      // Update local state copy of the lot status in editing view
      editingLot.statusLote = newStatus;
      setEditingLot(null);
    } catch (err: any) {
      setUpdateError(err.message || "Erro ao salvar alteração.");
    } finally {
      setIsUpdating(false);
    }
  };

  const renderLotElement = (
    lot: LotInfo, 
    x: number, 
    y: number, 
    w: number, 
    h: number
  ) => {
    const isSelected = selectedLotId === lot.id;
    const isHovered = hoveredLot?.id === lot.id;
    const isOccupied = lot.statusLote === "VENDIDO";

    return (
      <g
        key={lot.id}
        onClick={() => handleLotClick(lot)}
        onMouseEnter={() => setHoveredLot(lot)}
        onMouseLeave={() => setHoveredLot(null)}
        className="cursor-pointer select-none"
      >
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          rx="4"
          className={`transition-all duration-300 stroke-[1.5] ${getStatusColor(lot.statusLote)} ${
            isSelected ? "fill-sky-200/50 stroke-sky-700 stroke-[2.5] filter drop-shadow-md" : ""
          }`}
        />
        {/* Lot Number */}
        <text
          x={x + w / 2}
          y={y + h / 2 - (h > 35 ? 2 : 0)}
          textAnchor="middle"
          alignmentBaseline="middle"
          className={`text-[9px] font-extrabold transition-colors fill-zinc-700 pointer-events-none`}
        >
          {lot.loteNumero}
        </text>

        {/* Small Area Text (if height permits) */}
        {h > 35 && (
          <text
            x={x + w / 2}
            y={y + h / 2 + 10}
            textAnchor="middle"
            alignmentBaseline="middle"
            className="text-[6px] fill-zinc-400 pointer-events-none"
          >
            {lot.area}m²
          </text>
        )}

        {/* Red circle overlay for occupied lots matching the photo style */}
        {isOccupied && (
          <circle
            cx={x + w / 2}
            cy={y + (h > 35 ? 12 : h / 2)}
            r="4.5"
            className="fill-rose-500 stroke-white stroke-[1] pointer-events-none animate-pulse"
          />
        )}

        {/* Selected Lot Pulse Dot */}
        {isSelected && (
          <circle
            cx={x + 6}
            cy={y + 6}
            r="3"
            className="fill-sky-600 pointer-events-none"
          />
        )}
      </g>
    );
  };

  // Helper to render static blocks of lots
  const renderHorizontalBlock = (
    quadra: string,
    start: number,
    end: number,
    baseX: number,
    baseY: number,
    lotWidth: number,
    lotHeight: number,
    rtl = false
  ) => {
    const list: React.ReactNode[] = [];
    const count = Math.abs(end - start) + 1;
    const step = end >= start ? 1 : -1;

    for (let idx = 0; idx < count; idx++) {
      const num = start + idx * step;
      const lot = lots.find(l => l.quadra === quadra && l.loteNumero === String(num));
      if (!lot) continue;

      const positionIndex = rtl ? (count - 1 - idx) : idx;
      const x = baseX + positionIndex * lotWidth;
      const y = baseY;

      list.push(renderLotElement(lot, x, y, lotWidth - 3, lotHeight));
    }
    return list;
  };

  const renderVerticalBlock = (
    quadra: string,
    start: number,
    end: number,
    baseX: number,
    baseY: number,
    lotWidth: number,
    lotHeight: number
  ) => {
    const list: React.ReactNode[] = [];
    const count = Math.abs(end - start) + 1;
    const step = end >= start ? 1 : -1;

    for (let idx = 0; idx < count; idx++) {
      const num = start + idx * step;
      const lot = lots.find(l => l.quadra === quadra && l.loteNumero === String(num));
      if (!lot) continue;

      const x = baseX;
      const y = baseY + idx * lotHeight;

      list.push(renderLotElement(lot, x, y, lotWidth, lotHeight - 3));
    }
    return list;
  };

  return (
    <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 md:p-8 shadow-md space-y-6 relative overflow-hidden">
      {/* Header and Statistics */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-brand-text flex items-center gap-2">
            <Info className="w-5 h-5 text-brand-primary" />
            {mode === "edit" ? "Gerenciador do Mapa do Loteamento" : "Mapa Interativo do Loteamento"}
          </h3>
          <p className="text-xs md:text-sm text-brand-text/60">
            {mode === "edit" 
              ? "Clique em qualquer lote para alterar seu status de disponibilidade imediatamente." 
              : "Navegue pelo mapa oficial, passe o mouse para detalhes e clique para simular o parcelamento."}
          </p>
        </div>

        {/* Legend / Metrics */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-50 border border-sky-100 text-xs font-semibold text-sky-700">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
            <span>{disponiveis} Disponíveis</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-100 text-xs font-semibold text-amber-700">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span>{reservados} Reservados</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-100 text-xs font-semibold text-rose-700">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            <span>{vendidos} Ocupados / Vendidos</span>
          </div>
          <div className="text-xs font-bold text-brand-primary">
            Vendas: {Math.round((vendidos / total) * 100)}%
          </div>
        </div>
      </div>

      {/* SVG Container with horizontal scroll wrapper */}
      <div 
        className="relative w-full overflow-x-auto bg-zinc-50 rounded-2xl p-6 border border-zinc-100 cursor-crosshair min-w-[950px] select-none shadow-inner"
        onMouseMove={handleMouseMove}
      >
        <svg 
          viewBox="0 0 1100 850" 
          className="w-full h-auto max-h-[780px]"
        >
          {/* BACKGROUND LAYOUT STREETS (Asfalto) */}
          {/* Rua Projetada 02 (Top) */}
          <rect x="50" y="100" width="830" height="40" rx="6" fill="#cbd5e1" opacity="0.35" />
          <line x1="50" y1="120" x2="880" y2="120" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="6 4" />
          <text x="350" y="124" textAnchor="middle" fill="#475569" className="text-[9px] font-extrabold uppercase tracking-wider">Rua Projetada 02</text>

          {/* Rua Projetada 01 (Middle) */}
          <rect x="50" y="225" width="830" height="40" rx="6" fill="#cbd5e1" opacity="0.35" />
          <line x1="50" y1="245" x2="880" y2="245" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="6 4" />
          <text x="350" y="249" textAnchor="middle" fill="#475569" className="text-[9px] font-extrabold uppercase tracking-wider">Rua Projetada 01</text>

          {/* Avenida Projetada 01 (Horizontal part) */}
          <rect x="50" y="350" width="550" height="40" rx="6" fill="#cbd5e1" opacity="0.35" />
          <line x1="50" y1="370" x2="600" y2="370" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="6 4" />
          <text x="250" y="374" textAnchor="middle" fill="#475569" className="text-[9px] font-extrabold uppercase tracking-wider">Avenida Projetada 01</text>

          {/* Rua Projetada 04 (Vertical right) */}
          <rect x="630" y="50" width="40" height="340" rx="6" fill="#cbd5e1" opacity="0.35" />
          <line x1="650" y1="50" x2="650" y2="390" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="6 4" />
          <text x="654" y="280" transform="rotate(-90 654 280)" textAnchor="middle" fill="#475569" className="text-[9px] font-extrabold uppercase tracking-wider">Rua Projetada 04</text>

          {/* Rua Projetada 05 (Vertical left) */}
          <rect x="50" y="50" width="40" height="340" rx="6" fill="#cbd5e1" opacity="0.35" />
          <line x1="70" y1="50" x2="70" y2="390" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="6 4" />
          <text x="66" y="200" transform="rotate(-90 66 200)" textAnchor="middle" fill="#475569" className="text-[9px] font-extrabold uppercase tracking-wider">Rua Projetada 05</text>

          {/* Avenida Projetada 01 (Diagonal Part) */}
          <path d="M 520,370 L 980,680 L 1015,630 L 555,320 Z" fill="#cbd5e1" opacity="0.35" />
          <path d="M 537.5,345 L 997.5,655" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="6 4" />
          <text x="800" y="510" transform="rotate(33 800 510)" textAnchor="middle" fill="#475569" className="text-[9px] font-extrabold uppercase tracking-wider">Avenida Projetada 01</text>

          {/* Rua Projetada 03 (Diagonal Bottom) */}
          <path d="M 760,650 L 1050,850 L 1075,815 L 785,615 Z" fill="#cbd5e1" opacity="0.35" />
          <path d="M 772.5,632.5 L 1062.5,832.5" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="6 4" />
          <text x="910" y="730" transform="rotate(33 910 730)" textAnchor="middle" fill="#475569" className="text-[9px] font-extrabold uppercase tracking-wider">Rua Projetada 03</text>

          {/* Avenida Atlântica (Bottom Right Boundary) */}
          <rect x="800" y="800" width="300" height="40" fill="#475569" opacity="0.1" />
          <text x="950" y="825" textAnchor="middle" fill="#475569" className="text-[10px] font-black uppercase tracking-widest">Avenida Atlântica</text>

          {/* RENDER STATICS BLOCKS */}
          
          {/* Quadra C (Lots 1 to 8) */}
          {renderHorizontalBlock("C", 1, 8, 380, 50, 30, 47, true)}
          <circle cx="360" cy="73" r="9" className="fill-zinc-800" />
          <text x="360" y="76" textAnchor="middle" className="text-[9px] font-black fill-white">C</text>

          {/* Quadra F Top (Lots 1 to 15) */}
          {renderHorizontalBlock("F", 1, 15, 100, 142, 34, 40, true)}
          {/* Quadra F Bottom (Lots 16 to 30) */}
          {renderHorizontalBlock("F", 16, 30, 100, 183, 34, 40, false)}
          <circle cx="605" cy="180" r="10" className="fill-zinc-800" />
          <text x="605" y="183.5" textAnchor="middle" className="text-[10px] font-black fill-white">F</text>

          {/* Quadra E Top (Lots 1 to 14) */}
          {renderHorizontalBlock("E", 1, 14, 100, 268, 36.4, 40, true)}
          {/* Quadra E Bottom (Lots 15 to 27) */}
          {renderHorizontalBlock("E", 15, 27, 100, 309, 39.2, 40, false)}
          <circle cx="605" cy="305" r="10" className="fill-zinc-800" />
          <text x="605" y="308.5" textAnchor="middle" className="text-[10px] font-black fill-white">E</text>

          {/* Quadra A Column (Lots 13 to 16) */}
          {renderVerticalBlock("A", 13, 16, 680, 142, 50, 28)}
          <circle cx="705" cy="120" r="10" className="fill-zinc-800" />
          <text x="705" y="123.5" textAnchor="middle" className="text-[10px] font-black fill-white">A</text>

          {/* Quadra D_EXT (Horizontal Top: 14 to 26) */}
          {renderHorizontalBlock("D_EXT", 14, 26, 100, 393, 39.2, 47, true)}

          {/* DIAGONAL BLOCK D AND D_EXT (using rotated group) */}
          <g transform="translate(565, 395) rotate(33)">
            {/* Quadra D_EXT (Diagonal Part: Lots 1 to 13) */}
            {(() => {
              const list: React.ReactNode[] = [];
              for (let i = 1; i <= 13; i++) {
                const lot = lots.find(l => l.quadra === "D_EXT" && l.loteNumero === String(i));
                if (!lot) continue;
                // Alinhados do 13 ao 1 (13 topo esquerdo, 1 base direita)
                const x = (13 - i) * 31;
                const y = -48; // shift slightly to stay on the outer left side of Ave. Projetada 01
                list.push(renderLotElement(lot, x, y, 28, 45));
              }
              return list;
            })()}

            {/* Quadra D (Diagonal Inner Part: Lots 1 to 33) */}
            {(() => {
              const list: React.ReactNode[] = [];
              for (let i = 1; i <= 33; i++) {
                const lot = lots.find(l => l.quadra === "D" && l.loteNumero === String(i));
                if (!lot) continue;
                // Alinhados do 33 ao 1 (33 topo esquerdo, 1 base direita)
                const x = (33 - i) * 24;
                const y = 8; // shift to the inner right side of Ave. Projetada 01
                list.push(renderLotElement(lot, x, y, 21.5, 45));
              }
              return list;
            })()}

            {/* Circle markers inside diagonal space */}
            <circle cx="210" cy="-20" r="10" className="fill-zinc-800" transform="rotate(-33 210 -20)" />
            <text x="210" y="-16.5" textAnchor="middle" className="text-[10px] font-black fill-white" transform="rotate(-33 210 -20)">D</text>
          </g>

          {/* Quadra B Diagonal Bottom (Lots 1 to 8) */}
          <g transform="translate(810, 680) rotate(33)">
            {(() => {
              const list: React.ReactNode[] = [];
              for (let i = 1; i <= 8; i++) {
                const lot = lots.find(l => l.quadra === "B" && l.loteNumero === String(i));
                if (!lot) continue;
                // 8 topo esquerdo, 1 base direita
                const x = (8 - i) * 31;
                const y = 48; // Shift to sit next to Rua Projetada 03
                list.push(renderLotElement(lot, x, y, 28, 45));
              }
              return list;
            })()}
            
            <circle cx="110" cy="25" r="10" className="fill-zinc-800" transform="rotate(-33 110 25)" />
            <text x="110" y="28.5" textAnchor="middle" className="text-[10px] font-black fill-white" transform="rotate(-33 110 25)">B</text>
          </g>

          {/* Non-lotes graphics (e.g. green areas / leisure area / beach tennis) */}
          <rect x="735" y="50" width="145" height="70" rx="8" fill="#86efac" opacity="0.3" stroke="#22c55e" strokeWidth="1" strokeDasharray="3 3" />
          <text x="807" y="90" textAnchor="middle" className="text-[9px] font-extrabold fill-emerald-800">SISTEMA DE LAZER 2</text>

          <rect x="890" y="50" width="100" height="70" rx="8" fill="#86efac" opacity="0.3" stroke="#22c55e" strokeWidth="1" strokeDasharray="3 3" />
          <text x="940" y="90" textAnchor="middle" className="text-[8px] font-extrabold fill-emerald-800">ÁREA INSTITUCIONAL</text>

          <path d="M 760,180 L 980,180 L 1050,450 L 800,280 Z" fill="#86efac" opacity="0.25" stroke="#22c55e" strokeWidth="1" strokeDasharray="3 3" />
          <text x="880" y="230" textAnchor="middle" className="text-[9px] font-extrabold fill-emerald-800">ÁREA INSTITUCIONAL</text>
          <text x="910" y="350" textAnchor="middle" className="text-[9px] font-extrabold fill-emerald-800">SISTEMA DE LAZER 01</text>
        </svg>

        {/* Hover Tooltip (Absolute overlay on hover) */}
        {hoveredLot && !editingLot && (
          <div 
            className="absolute z-30 bg-zinc-900/95 text-white p-4 rounded-2xl shadow-2xl border border-white/10 pointer-events-none transition-opacity duration-150 flex flex-col gap-1.5 w-60"
            style={{ 
              left: `${tooltipPos.x}px`, 
              top: `${tooltipPos.y}px` 
            }}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
              <span className="font-extrabold text-sm text-amber-400">
                Quadra {hoveredLot.quadra === "D_EXT" ? "D (Ext)" : hoveredLot.quadra} — Lote {hoveredLot.loteNumero}
              </span>
              <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full border ${getStatusBorderClass(hoveredLot.statusLote)}`}>
                {getStatusLabel(hoveredLot.statusLote)}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-[10px] pt-1">
              <div>
                <span className="text-white/40 block text-[9px] uppercase font-semibold">Tamanho</span>
                <span className="font-bold text-white">{hoveredLot.area} m²</span>
              </div>
              <div>
                <span className="text-white/40 block text-[9px] uppercase font-semibold">Topografia</span>
                <span className="font-bold text-white capitalize">{hoveredLot.topografia.toLowerCase().replace("_", " ")}</span>
              </div>
            </div>

            {hoveredLot.statusLote !== "VENDIDO" && (
              <div className="pt-1.5 border-t border-white/10">
                <span className="text-white/40 block text-[9px] uppercase font-semibold">Valor Especial</span>
                <span className="font-extrabold text-amber-400 text-sm">
                  R$ {hoveredLot.valorVenda.toLocaleString("pt-BR")}
                </span>
                <span className="text-[8px] text-emerald-400 block font-medium">
                  Parcelas a partir de R$ {(hoveredLot.valorVenda * 0.0055).toLocaleString("pt-BR", {maximumFractionDigits: 0})}/mês
                </span>
              </div>
            )}
            
            {hoveredLot.statusLote === "VENDIDO" && (
              <div className="text-[9px] text-zinc-400 italic pt-1 text-center border-t border-white/10">
                Lote vendido/indisponível.
              </div>
            )}
          </div>
        )}

        {/* CRM Toggle Status Popover (modal overlay inside map area) */}
        {editingLot && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-white border border-zinc-200 p-6 rounded-2xl shadow-2xl flex flex-col gap-4 w-80 max-w-sm animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
              <h4 className="font-extrabold text-sm text-zinc-800">
                Gerenciar Lote: Quadra {editingLot.quadra === "D_EXT" ? "D (Ext)" : editingLot.quadra} - Lote {editingLot.loteNumero}
              </h4>
              <button 
                onClick={() => setEditingLot(null)}
                className="text-zinc-400 hover:text-zinc-600 transition-colors p-0.5 rounded-lg hover:bg-zinc-50"
                disabled={isUpdating}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {updateError && (
              <div className="flex items-start gap-1.5 rounded-xl bg-rose-50 border border-rose-100 p-3 text-xs text-rose-800">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                <span>{updateError}</span>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <span className="text-[10px] uppercase font-bold text-zinc-400">Alterar Status de Disponibilidade:</span>
              <button
                onClick={() => handleStatusChange("DISPONIVEL")}
                className={`w-full py-2.5 px-4 rounded-xl border font-bold text-xs transition-all flex items-center justify-between ${
                  editingLot.statusLote === "DISPONIVEL"
                    ? "bg-sky-50 border-sky-300 text-sky-700 shadow-sm"
                    : "border-zinc-200 hover:bg-zinc-50 text-zinc-700"
                }`}
                disabled={isUpdating}
              >
                <span>Disponível (Azul)</span>
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
              </button>

              <button
                onClick={() => handleStatusChange("RESERVADO")}
                className={`w-full py-2.5 px-4 rounded-xl border font-bold text-xs transition-all flex items-center justify-between ${
                  editingLot.statusLote === "RESERVADO"
                    ? "bg-amber-50 border-amber-300 text-amber-700 shadow-sm"
                    : "border-zinc-200 hover:bg-zinc-50 text-zinc-700"
                }`}
                disabled={isUpdating}
              >
                <span>Reservado (Amarelo)</span>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              </button>

              <button
                onClick={() => handleStatusChange("VENDIDO")}
                className={`w-full py-2.5 px-4 rounded-xl border font-bold text-xs transition-all flex items-center justify-between ${
                  editingLot.statusLote === "VENDIDO"
                    ? "bg-rose-50 border-rose-300 text-rose-700 shadow-sm"
                    : "border-zinc-200 hover:bg-zinc-50 text-zinc-700"
                }`}
                disabled={isUpdating}
              >
                <span>Ocupado / Vendido (Vermelho)</span>
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              </button>
            </div>

            {isUpdating && (
              <div className="flex items-center justify-center gap-2 text-xs font-medium text-zinc-500 bg-zinc-50 py-2 rounded-xl">
                <Loader2 className="w-4 h-4 animate-spin text-brand-primary" />
                <span>Atualizando no banco...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Help Prompt */}
      <div className="bg-brand-bg-primary/40 rounded-xl p-4 flex gap-3 items-start border border-brand-bg-primary/30">
        <HelpCircle className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
        <div className="text-xs md:text-sm text-brand-text/80 leading-relaxed">
          {mode === "edit" ? (
            <div>
              <span className="font-bold text-brand-text">Modo CRM / Edição de Site:</span> Clique em qualquer lote do mapa acima para abrir o painel de alteração rápida. Escolha entre <strong>Disponível (Azul)</strong>, <strong>Reservado (Amarelo)</strong> ou <strong>Ocupado / Vendido (Vermelho com sinal circular)</strong>. O status é atualizado imediatamente no banco de dados e sincronizado no site público.
            </div>
          ) : (
            <div>
              <span className="font-bold text-brand-text">Como funciona o mapa:</span> Navegue pelos lotes. As unidades coloridas em <strong>azul</strong> representam os lotes disponíveis e aptos para simulação financeira. Os lotes em <strong>amarelo</strong> encontram-se reservados. Os lotes em <strong>vermelho com marcação circular</strong> já estão vendidos / ocupados.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
