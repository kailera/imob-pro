"use client";

import React from "react";
import { ClipboardCopy, MapPin, User, Calendar, ClipboardCheck, ArrowUpRight, Eye } from "lucide-react";

export interface Vistoria {
  id: string;
  codigo: string;
  tipo: "Entrada" | "Saída" | "Periódica";
  status: "nao_iniciada" | "em_andamento" | "aguardando_aprovacao" | "concluida" | "contestada";
  statusLabel: string;
  solicitadaPor: string;
  dataSolicitacao: string;
  dataVistoria?: string;
  vistoriador: string;
  imovelCodigo: string;
  endereco: string;
  proprietario: string;
  inquilino: string;
  tipoImovel: string;
}

interface VistoriaDetailsProps {
  vistoria: Vistoria;
  onViewFullReport?: (id: string) => void;
}

const statusBadgeClasses = {
  nao_iniciada: "bg-slate-100 text-slate-700 border-slate-200",
  em_andamento: "bg-[#F0D18A]/20 text-[#8c6d1f] border-[#F0D18A]/40",
  aguardando_aprovacao: "bg-[#004777]/10 text-[#004777] border-[#004777]/20",
  concluida: "bg-[#708D81]/15 text-[#708D81] border-[#708D81]/30",
  contestada: "bg-red-50 text-red-700 border-red-100",
};

export function VistoriaDetails({ vistoria, onViewFullReport }: VistoriaDetailsProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#EEEEF3] p-6 sm:p-8 flex flex-col gap-6 relative overflow-hidden transition-all duration-300">
      {/* Visual Accent */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#004777]" />

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EEEEF3] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>Código da Vistoria</span>
          </div>
          <h3 className="text-xl font-bold text-[#280003] flex items-center gap-2">
            {vistoria.codigo}
            <button
              onClick={() => navigator.clipboard.writeText(vistoria.codigo)}
              className="text-gray-400 hover:text-[#004777] p-1 rounded hover:bg-[#EEEEF3] transition-colors"
              title="Copiar código"
            >
              <ClipboardCopy className="w-3.5 h-3.5" />
            </button>
          </h3>
        </div>
        <div>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
              statusBadgeClasses[vistoria.status]
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current mr-2 animate-pulse" />
            {vistoria.statusLabel}
          </span>
        </div>
      </div>

      {/* Section 1: Informações da Vistoria */}
      <div>
        <h4 className="text-xs font-bold text-[#004777] uppercase tracking-widest mb-4 flex items-center gap-2">
          <span>Informações da Vistoria</span>
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-6">
          <div>
            <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Tipo
            </span>
            <span className="text-sm font-semibold text-[#280003] bg-[#EEEEF3] px-2 py-1 rounded">
              {vistoria.tipo}
            </span>
          </div>
          <div>
            <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Solicitada por
            </span>
            <span className="text-sm font-bold text-[#280003]">{vistoria.solicitadaPor}</span>
          </div>
          <div>
            <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Data de Solicitação
            </span>
            <span className="text-sm font-bold text-[#280003]">{vistoria.dataSolicitacao}</span>
          </div>
          <div>
            <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Data Vistoria
            </span>
            <span className="text-sm font-bold text-[#280003] flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-gray-400" />
              {vistoria.dataVistoria || "Não definida"}
            </span>
          </div>
          <div className="md:col-span-2">
            <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Vistoriador Designado
            </span>
            <span className="text-sm font-bold text-[#280003] flex items-center gap-1.5">
              <User className="w-4 h-4 text-gray-400" />
              {vistoria.vistoriador}
            </span>
          </div>
        </div>
      </div>

      <div className="h-px bg-[#EEEEF3]" />

      {/* Section 2: Dados do Imóvel */}
      <div>
        <h4 className="text-xs font-bold text-[#004777] uppercase tracking-widest mb-4">
          Dados do Imóvel
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-6">
          <div>
            <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Cód. Imóvel
            </span>
            <span className="text-sm font-bold text-[#280003]">{vistoria.imovelCodigo}</span>
          </div>
          <div>
            <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Tipo do Imóvel
            </span>
            <span className="text-sm font-bold text-[#280003]">{vistoria.tipoImovel}</span>
          </div>
          <div>
            <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Proprietário
            </span>
            <span className="text-sm font-bold text-[#280003]">{vistoria.proprietario}</span>
          </div>
          <div className="md:col-span-3">
            <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Endereço
            </span>
            <span className="text-sm font-bold text-[#280003] flex items-start gap-1.5">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <span>{vistoria.endereco}</span>
            </span>
          </div>
          <div className="md:col-span-3">
            <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Locatário / Inquilino
            </span>
            <span className="text-sm font-bold text-[#280003]">{vistoria.inquilino}</span>
          </div>
        </div>
      </div>

      <div className="h-px bg-[#EEEEF3] mt-2" />

      {/* Footer Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-end gap-3 mt-2">
        <button className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-[#EEEEF3] text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
          <Eye className="w-4 h-4" />
          <span>Ver Fotos</span>
        </button>
        <button
          onClick={() => onViewFullReport?.(vistoria.id)}
          className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-[#004777] text-white text-sm font-semibold hover:bg-[#00365a] shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 group"
        >
          <span>Informações da Vistoria</span>
          <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
}
