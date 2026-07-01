"use client";

import { useState } from "react";
import { SubdivisionMap, LotInfo } from "@/components/SubdivisionMap";
import { FinanceSimulator } from "@/components/FinanceSimulator";

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
    </div>
  );
}
