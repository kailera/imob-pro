"use client";

import React from "react";
import { ClipboardCheck, MapPin, Key, Box, FileText, AlertTriangle, FileSignature, CheckCircle2 } from "lucide-react";
import { CommentData } from "./CommentsTimeline";

interface DetailSectionsProps {
  comments?: CommentData[];
  reportDescription?: string;
  reportObservation?: string;
}

export function DetailSections({ comments, reportDescription, reportObservation }: DetailSectionsProps) {
  return (
    <div className="flex flex-col gap-6 w-full pb-20">
      
      {/* 1. Informações da Vistoria */}
      <section id="informacoes" className="bg-white rounded-2xl border border-[#EEEEF3] shadow-sm p-6 sm:p-8 page-break-inside-avoid">
        <h2 className="text-sm font-bold text-[#004777] uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-[#EEEEF3] pb-3">
          <ClipboardCheck className="w-5 h-5" />
          Informações da Vistoria
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-6">
          <div>
            <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Tipo</span>
            <span className="text-sm font-bold text-[#280003]">Entrada</span>
          </div>
          <div>
            <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Status</span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border bg-[#708D81]/15 text-[#708D81] border-[#708D81]/30">
              Concluída
            </span>
          </div>
          <div>
            <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Data da Vistoria</span>
            <span className="text-sm font-bold text-[#280003]">22 de Junho de 2026</span>
          </div>
          <div>
            <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Vistoriador</span>
            <span className="text-sm font-bold text-[#280003]">Rodrigo Silva</span>
          </div>
        </div>
      </section>

      {/* 2. Dados do Imóvel */}
      <section id="dados-imovel" className="bg-white rounded-2xl border border-[#EEEEF3] shadow-sm p-6 sm:p-8 page-break-inside-avoid">
        <h2 className="text-sm font-bold text-[#004777] uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-[#EEEEF3] pb-3">
          <MapPin className="w-5 h-5" />
          Dados do Imóvel
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-6">
          <div>
            <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Cód. Imóvel</span>
            <span className="text-sm font-bold text-[#280003]">IMOB-9041</span>
          </div>
          <div>
            <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Tipo de Imóvel</span>
            <span className="text-sm font-bold text-[#280003]">Apartamento</span>
          </div>
          <div className="sm:col-span-2">
            <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Endereço Completo</span>
            <span className="text-sm font-bold text-[#280003]">Av. Paulista, 1200 - Apto 84 - Bela Vista, São Paulo/SP</span>
          </div>
          <div>
            <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Proprietário</span>
            <span className="text-sm font-bold text-[#280003]">Carlos Eduardo Santos</span>
          </div>
          <div>
            <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Inquilino</span>
            <span className="text-sm font-bold text-[#280003]">Juliana Vieira Ramos</span>
          </div>
        </div>
      </section>

      {/* 3. Localização das Chaves */}
      <section id="chaves" className="bg-white rounded-2xl border border-[#EEEEF3] shadow-sm p-6 sm:p-8 page-break-inside-avoid">
        <h2 className="text-sm font-bold text-[#004777] uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-[#EEEEF3] pb-3">
          <Key className="w-5 h-5" />
          Localização das Chaves
        </h2>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#708D81]"></span>
            <span className="text-sm text-[#280003] font-medium">As chaves foram retiradas na imobiliária (Matriz).</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#708D81]"></span>
            <span className="text-sm text-[#280003] font-medium">Quantidade: 2 chaves (porta principal e portão social).</span>
          </div>
          <div className="flex items-center gap-3 mt-2 bg-[#EEEEF3]/50 p-3 rounded-lg border border-[#EEEEF3]">
            <CheckCircle2 className="w-5 h-5 text-[#708D81]" />
            <span className="text-sm text-[#280003] font-semibold">Chaves devolvidas e validadas pela recepção.</span>
          </div>
        </div>
      </section>

      {/* 4. O Relatório */}
      <section id="relatorio" className="bg-white rounded-2xl border border-[#EEEEF3] shadow-sm p-6 sm:p-8 page-break-inside-avoid">
        <h2 className="text-sm font-bold text-[#004777] uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-[#EEEEF3] pb-3">
          <FileText className="w-5 h-5" />
          O Relatório
        </h2>
        <div className="prose prose-sm text-[#280003] max-w-none">
          {reportDescription ? (
            <p className="leading-relaxed whitespace-pre-wrap">
              {reportDescription}
            </p>
          ) : (
            <p className="leading-relaxed text-gray-400 italic">
              Nenhuma descrição do relatório inserida.
            </p>
          )}
          {reportObservation && (
            <p className="leading-relaxed mt-4 font-medium bg-[#F0D18A]/10 p-3 rounded-lg border border-[#F0D18A]/30 text-[#8c6d1f] whitespace-pre-wrap">
              <strong>Observação técnica:</strong> {reportObservation}
            </p>
          )}
        </div>
      </section>

      {/* 5. Contestação */}
      <section id="contestacao" className="bg-white rounded-2xl border border-[#EEEEF3] shadow-sm p-6 sm:p-8 page-break-inside-avoid">
        <h2 className="text-sm font-bold text-red-700 uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-red-100 pb-3">
          <AlertTriangle className="w-5 h-5" />
          Contestação
        </h2>
        <div className="flex flex-col items-center justify-center py-6 text-center text-gray-500">
          <CheckCircle2 className="w-8 h-8 text-[#708D81] mb-2" />
          <p className="text-sm font-semibold text-[#280003]">Nenhuma contestação registrada.</p>
          <p className="text-xs mt-1">As partes concordaram com todos os termos do relatório da vistoria original.</p>
        </div>
      </section>

      {/* 6. Participantes que Assinaram */}
      <section id="participantes" className="bg-white rounded-2xl border border-[#EEEEF3] shadow-sm p-6 sm:p-8 page-break-inside-avoid">
        <h2 className="text-sm font-bold text-[#004777] uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-[#EEEEF3] pb-3">
          <FileSignature className="w-5 h-5" />
          Participantes que Assinaram
        </h2>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between p-4 border border-[#708D81]/30 bg-[#708D81]/5 rounded-xl">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-[#280003]">Carlos Eduardo Santos</span>
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wider mt-0.5">Proprietário</span>
            </div>
            <div className="flex items-center gap-2 text-[#708D81] bg-white px-2.5 py-1 rounded-full border border-[#708D81]/20 shadow-sm text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" /> Assinado
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border border-[#708D81]/30 bg-[#708D81]/5 rounded-xl">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-[#280003]">Juliana Vieira Ramos</span>
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wider mt-0.5">Inquilina</span>
            </div>
            <div className="flex items-center gap-2 text-[#708D81] bg-white px-2.5 py-1 rounded-full border border-[#708D81]/20 shadow-sm text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" /> Assinado
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border border-[#EEEEF3] bg-gray-50 rounded-xl">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-[#280003]">Rodrigo Silva</span>
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wider mt-0.5">Vistoriador Responsável</span>
            </div>
            <div className="flex items-center gap-2 text-[#708D81] bg-white px-2.5 py-1 rounded-full border border-[#EEEEF3] shadow-sm text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" /> Assinado
            </div>
          </div>
        </div>
      </section>

      {/* 7. Notas e Observações Adicionais (Live Comments) */}
      {comments && comments.length > 0 && (
        <section id="observacoes-adicionais" className="bg-white rounded-2xl border border-[#EEEEF3] shadow-sm p-6 sm:p-8 page-break-inside-avoid">
          <h2 className="text-sm font-bold text-[#004777] uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-[#EEEEF3] pb-3">
            <FileText className="w-5 h-5" />
            Observações do Vistoriador ({comments.length})
          </h2>
          <div className="flex flex-col gap-4">
            {comments.map((comment) => (
              <div key={comment.id} className="p-4 bg-gray-50/50 border border-[#EEEEF3] rounded-xl relative">
                <div className="flex items-start justify-between mb-2">
                  <span className="px-2.5 py-1 bg-white text-[#004777] border border-[#EEEEF3] rounded-md text-xs font-bold">
                    {comment.roomName}
                  </span>
                  <span className="text-[10px] font-medium text-gray-400">
                    {new Date(comment.timestamp).toLocaleDateString()} às {new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                
                <p className="text-sm text-[#280003] leading-relaxed mb-3 whitespace-pre-wrap">
                  {comment.text}
                </p>

                {comment.media && comment.media.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
                    {comment.media.map((med, idx) => (
                      <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-[#EEEEF3] bg-gray-100 flex items-center justify-center shadow-sm">
                        {med.type === "image" ? (
                          <img 
                            src={med.url} 
                            alt="Anexo da Vistoria" 
                            onClick={() => window.open(med.url, '_blank')}
                            className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform" 
                          />
                        ) : (
                          <video 
                            src={med.url} 
                            controls 
                            className="w-full h-full object-cover" 
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
                  {comment.status === 'Aprovado' ? (
                    <span className="text-[#708D81] flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Aprovado
                    </span>
                  ) : (
                    <span className="text-[#8c6d1f] flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Requer Atenção
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

    </div>
  );
}
