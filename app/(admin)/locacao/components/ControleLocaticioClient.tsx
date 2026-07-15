"use client";

import React, { useState } from "react";
import { TrendingUp, Plus, Trash2 } from "lucide-react";

interface Periodo {
  id: string;
  dataInicio: any;
  dataFim: any;
  valorAluguel: number;
  hasCondominio: boolean;
  valorCondominio: number | null;
  hasIPTU: boolean;
  valorIPTU: number | null;
  valorTotal: number;
  descontoPontualidade: number | null;
  tipoDesconto: string | null;
  diasAntecedenciaDesc: number | null;
  multaAtrasoPercentual: number | null;
  diasCarenciaMulta: number | null;
  jurosAtrasoPercentual: number | null;
  diasCarenciaJuros: number | null;
}

interface ControleLocaticioClientProps {
  periodos: Periodo[];
  imovelLocacaoId: string;
  onAddPeriodo?: () => void;
  onEditPeriodo?: (periodo: Periodo) => void;
}

export default function ControleLocaticioClient({
  periodos,
  imovelLocacaoId,
  onAddPeriodo,
  onEditPeriodo,
}: ControleLocaticioClientProps) {
  const [selectedPeriodoId, setSelectedPeriodoId] = useState<string>(
    periodos.length > 0 ? periodos[periodos.length - 1].id : ""
  );

  const activePeriodo = periodos.find((p) => p.id === selectedPeriodoId) || periodos[0];

  const formatCurrency = (val: number | null | undefined) => {
    if (val === null || val === undefined) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
  };

  const formatDate = (date: any) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("pt-BR");
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-150 p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <h2 className="font-bold text-sm text-[#280003] uppercase tracking-widest flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-600" />
          Controle Locatício
        </h2>
        {onAddPeriodo && (
          <button
            onClick={onAddPeriodo}
            className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar Período
          </button>
        )}
      </div>

      {periodos.length > 0 ? (
        <div className="space-y-4">
          {/* Abas dos Períodos */}
          <div className="flex flex-wrap gap-1.5 border-b border-gray-100 pb-2">
            {periodos.map((p) => {
              const isSelected = p.id === selectedPeriodoId;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPeriodoId(p.id)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${isSelected
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : "bg-gray-50 text-gray-500 border-gray-150 hover:bg-gray-100"
                    }`}
                >
                  {formatDate(p.dataInicio)}
                </button>
              );
            })}
          </div>

          {activePeriodo && (
            <div className="space-y-4 text-xs font-semibold text-gray-700">
              <div className="flex justify-between items-center pb-2 border-b border-gray-55/10">
                <span className="text-gray-400 text-[10px] uppercase font-bold">Aluguel Vigente</span>
                <span className="font-black text-brand-dark text-sm">{formatCurrency(activePeriodo.valorAluguel)}</span>
              </div>

              {/* Bloco: Pontualidade */}
              <div className="space-y-1.5 pb-3 border-b border-gray-50">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-[10px] uppercase font-bold">Desconto Pontualidade</span>
                  {onEditPeriodo && (
                    <button
                      onClick={() => onEditPeriodo(activePeriodo)}
                      className="text-[9px] font-bold text-[#004777] hover:underline"
                    >
                      Editar Período
                    </button>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Valor/Percentual</span>
                  <span className="font-bold text-emerald-600">
                    {activePeriodo.tipoDesconto === "PERCENTUAL" || activePeriodo.tipoDesconto === "PERCENTUAL"
                      ? `${activePeriodo.descontoPontualidade}%`
                      : formatCurrency(activePeriodo.descontoPontualidade)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Antecedência</span>
                  <span className="font-bold text-brand-dark">
                    {activePeriodo.diasAntecedenciaDesc ? `Até ${activePeriodo.diasAntecedenciaDesc} dias antes` : "-"}
                  </span>
                </div>
              </div>

              {/* Bloco: Multa e Juros (Atraso) */}
              <div className="space-y-1.5 pb-3 border-b border-gray-50">
                <span className="text-gray-400 text-[10px] uppercase font-bold block">Encargos por Atraso</span>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Multa</span>
                  <span className="font-bold text-rose-600">
                    {activePeriodo.multaAtrasoPercentual}% (Após {activePeriodo.diasCarenciaMulta} dias)
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Juros (Pro Rata)</span>
                  <span className="font-bold text-rose-600">
                    {activePeriodo.jurosAtrasoPercentual}% (Após {activePeriodo.diasCarenciaJuros} dias)
                  </span>
                </div>
              </div>

              {/* Bloco: Encargos Inclusos */}
              <div className="space-y-1.5">
                <span className="text-gray-400 text-[10px] uppercase font-bold block">Encargos Inclusos</span>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Condomínio</span>
                  <span className="font-bold text-brand-dark">
                    {activePeriodo.hasCondominio ? formatCurrency(activePeriodo.valorCondominio) : "Não incluso"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">IPTU</span>
                  <span className="font-bold text-brand-dark">
                    {activePeriodo.hasIPTU ? formatCurrency(activePeriodo.valorIPTU) : "Não incluso"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-gray-400 italic">Nenhum período cadastrado.</p>
      )}
    </div>
  );
}
