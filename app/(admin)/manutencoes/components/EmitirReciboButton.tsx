"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import type { ManutencaoView } from "../types";

type Props = {
  manutencao: ManutencaoView;
  className?: string;
  onBeforeEmit?: () => void;
};

export function EmitirReciboButton({ manutencao, className = "", onBeforeEmit }: Props) {
  const [emitting, setEmitting] = useState(false);

  async function handleEmit() {
    onBeforeEmit?.();
    setEmitting(true);
    try {
      const { emitirReciboManutencao } = await import("@/lib/manutencoes/reciboPdf");
      const result = await emitirReciboManutencao(manutencao);
      if (result.skipped.length > 0) {
        window.alert(`O recibo foi emitido, mas não foi possível incluir: ${result.skipped.join(", ")}.`);
      }
    } catch (error) {
      console.error("Erro ao emitir recibo de manutenção:", error);
      window.alert("Não foi possível emitir o recibo. Verifique os anexos e tente novamente.");
    } finally {
      setEmitting(false);
    }
  }

  return (
    <button type="button" disabled={emitting} onClick={handleEmit} className={className}>
      {emitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
      {emitting ? "Emitindo..." : "Emitir recibo"}
    </button>
  );
}
