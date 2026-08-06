"use client";

import { Map as MapIcon } from "lucide-react";

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
  mapImageUrl?: string | null;
}

export function SubdivisionMap({ mapImageUrl }: SubdivisionMapProps) {
  return (
    <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 md:p-8 shadow-md space-y-4 overflow-hidden">
      <h3 className="text-lg font-bold text-zinc-800 flex items-center gap-2">
        <MapIcon className="w-5 h-5 text-brand-primary" />
        <span>Mapa de Disponibilidade</span>
      </h3>
      <p className="text-xs md:text-sm text-zinc-500">
        Confira abaixo o mapa oficial atualizado com os lotes disponíveis e vendidos.
      </p>

      <div className="w-full relative rounded-2xl overflow-hidden border border-zinc-200 bg-zinc-50 shadow-inner flex items-center justify-center p-2 min-h-[300px] md:min-h-[450px]">
        {mapImageUrl ? (
          <img 
            src={mapImageUrl} 
            alt="Mapa de Disponibilidade do Loteamento" 
            className="max-h-[600px] w-auto h-auto object-contain transition-transform duration-300 hover:scale-[1.02]" 
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-zinc-400 gap-2 p-8">
            <MapIcon className="w-12 h-12 text-zinc-300" />
            <div className="text-center">
              <span className="text-xs font-extrabold text-zinc-700 block">Nenhuma imagem de mapa carregada</span>
              <span className="text-[10px] text-zinc-400 block mt-1 leading-relaxed">
                O mapa de disponibilidade ainda não foi configurado no painel administrativo.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
