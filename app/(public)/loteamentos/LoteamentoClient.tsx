"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { SubdivisionMap, LotInfo } from "@/components/loteamentos/SubdivisionMap";
import { FinanceSimulator } from "@/components/loteamentos/FinanceSimulator";

const LoteamentoProximidadeMap = dynamic(() => import("@/components/loteamentos/LoteamentoProximidadeMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[420px] flex items-center justify-center bg-zinc-100 text-zinc-500 font-semibold text-sm rounded-3xl">
      Carregando mapa de proximidades...
    </div>
  ),
});

interface LoteamentoClientProps {
  initialLots: LotInfo[];
}

export function LoteamentoClient({ initialLots }: LoteamentoClientProps) {
  const [selectedLot, setSelectedLot] = useState<LotInfo | null>(null);

  const handleSelectLot = (lot: LotInfo) => {
    setSelectedLot(lot);
  };

  return (
    <div className="space-y-12">
      {/* Seção 1: O Mapa Interativo */}
      <div id="mapa-section" className="scroll-mt-24">
        <SubdivisionMap 
          lots={initialLots} 
          selectedLotId={selectedLot?.id} 
          onSelectLot={handleSelectLot} 
        />
      </div>

      {/* Seção 2: O Simulador Financeiro */}
      <div id="simulador-section" className="scroll-mt-24">
        <FinanceSimulator selectedLot={selectedLot} />
      </div>

      {/* Seção 3: Localização e Proximidades */}
      <div className="pt-12 border-t border-zinc-200 space-y-8">
        <div className="text-center space-y-3 max-w-xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-primary">Localização Privilegiada</span>
          <h2 className="text-3xl font-extrabold text-brand-text font-black">O que há por perto?</h2>
          <p className="text-sm text-brand-text/60">
            Veja a distância do Loteamento Village Parra até os principais serviços de Ilha Solteira.
          </p>
        </div>
        <LoteamentoProximidadeMap />
      </div>
    </div>
  );
}
