"use client";

import { useState, useEffect } from "react";
import { SubdivisionMap, LotInfo } from "@/components/loteamentos/SubdivisionMap";
import { getLoteamentoLots, updateLotStatusAction } from "@/app/actions/imoveisActions";
import { Map, Loader2, AlertCircle, RefreshCw } from "lucide-react";

interface EditorLoteamentoProps {
  onShowToast?: (message: string) => void;
}

export default function EditorLoteamento({ onShowToast }: EditorLoteamentoProps) {
  const [lots, setLots] = useState<LotInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadLots() {
    setLoading(true);
    setError(null);
    try {
      const res = await getLoteamentoLots("village-parra");
      if (res.success && res.data) {
        setLots(res.data);
      } else {
        setError(res.error || "Não foi possível carregar os lotes do loteamento.");
      }
    } catch (err: any) {
      setError(err.message || "Erro de conexão ao carregar lotes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLots();
  }, []);

  const handleLotStatusChange = async (lotId: string, status: "DISPONIVEL" | "RESERVADO" | "VENDIDO") => {
    const res = await updateLotStatusAction(lotId, status);
    if (res.success) {
      setLots((prev) =>
        prev.map((l) => (l.id === lotId ? { ...l, statusLote: status } : l))
      );
      if (onShowToast) {
        onShowToast(res.message || "Status do lote atualizado com sucesso!");
      }
    } else {
      throw new Error(res.error || "Falha ao atualizar o status no servidor.");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-400 gap-2 text-xs font-semibold">
        <Loader2 className="w-6 h-6 animate-spin text-brand-primary" />
        <span>Carregando o mapa interativo e lotes...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-100 rounded-2xl p-6 flex flex-col items-center gap-4 text-center max-w-md mx-auto my-12">
        <AlertCircle className="w-10 h-10 text-rose-500" />
        <div>
          <h4 className="font-extrabold text-sm text-zinc-800">Falha ao Carregar o Mapa</h4>
          <p className="text-xs text-zinc-600 mt-1">{error}</p>
        </div>
        <button
          onClick={loadLots}
          className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl hover:bg-rose-700 transition-colors shadow-sm cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Tentar Novamente</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
        <div>
          <h3 className="text-lg font-bold text-zinc-800 flex items-center gap-2">
            <Map className="w-5 h-5 text-brand-primary" />
            <span>Gerenciar Loteamento: Village Parra</span>
          </h3>
          <p className="text-xs text-zinc-500">
            Mapeamento em tempo real de Ilha Solteira - SP. Clique nos lotes no mapa oficial abaixo para gerenciar a visibilidade pública.
          </p>
        </div>
      </div>

      <SubdivisionMap 
        lots={lots} 
        mode="edit" 
        onLotStatusChange={handleLotStatusChange} 
      />
    </div>
  );
}
