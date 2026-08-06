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
  mapaUrl?: string | null;
}

export function LoteamentoClient({ initialLots, mapaUrl }: LoteamentoClientProps) {
  const [selectedLot, setSelectedLot] = useState<LotInfo | null>(null);

  // Filter lots that are available or reserved for simulation
  const availableLots = initialLots.filter(l => l.statusLote === "DISPONIVEL" || l.statusLote === "RESERVADO");

  return (
    <div className="space-y-12">
      {/* Seção 1: O Mapa */}
      <div id="mapa-section" className="scroll-mt-24">
        <SubdivisionMap mapImageUrl={mapaUrl} />
      </div>

      {/* Seção 2: Condições de Pagamento */}
      <div id="pagamento-section" className="scroll-mt-24 bg-white border border-zinc-200/80 rounded-3xl p-6 md:p-8 shadow-md space-y-6">
        <div className="border-b border-zinc-100 pb-4">
          <h3 className="text-lg font-bold text-zinc-800">Condições Especiais de Pagamento</h3>
          <p className="text-xs text-zinc-500 mt-1">
            Selecione o lote desejado no seletor abaixo (ou clique diretamente no mapa acima) para ver as condições específicas do terreno.
          </p>
        </div>



        <div className="pt-4 border-t border-zinc-100">
          <FinanceSimulator selectedLot={selectedLot} />
        </div>
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
