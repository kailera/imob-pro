"use client";

import React from "react";
import { ClipboardList, Key, FileText, CheckSquare, Eye, Users, ShieldAlert, Image as ImageIcon } from "lucide-react";
import { Room } from "./FloorPlanVisualizer";
import { CommentData } from "./CommentsTimeline";
import { PreviewableImage } from "./PreviewableImage";

interface InfoGeralItem {
  id: number;
  titulo: string;
  conteudo: string;
}

interface DetailSectionsProps {
  comments?: CommentData[];
  reportDescription?: string;
  reportObservation?: string;
  rooms?: Room[];
  solicitante?: string;
  infoGeralItems?: InfoGeralItem[];
  onUpdateInfoGeralItem?: (id: number, newConteudo: string) => void;
  chavesQuantidade?: number;
  chavesObservacao?: string;
  vistoriaStatus?: string;
  proprietario?: string;
  vistoriador?: string;
  assinatura?: string | null;
}

export function DetailSections({
  comments = [],
  reportDescription = "",
  reportObservation = "",
  rooms = [],
  solicitante = "",
  infoGeralItems = [],
  onUpdateInfoGeralItem,
  chavesQuantidade = 0,
  chavesObservacao = "",
  vistoriaStatus = "",
  proprietario = "Proprietário",
  vistoriador = "Vistoriador Designado",
  assinatura = null
}: DetailSectionsProps) {

  return (
    <div className="flex flex-col gap-8 w-full bg-white print:gap-4 print:p-0">

      {/* 1. Informações da Vistoria */}
      <section className="bg-white rounded-2xl border border-[#EEEEF3] p-5 sm:p-6 shadow-sm flex flex-col gap-4 print:border-none print:shadow-none print:p-0">
        <h3 className="text-base font-bold text-[#280003] flex items-center gap-2 border-b border-[#EEEEF3] pb-3 print:pb-1">
          <ClipboardList className="w-5 h-5 text-[#004777] print:hidden" />
          <span>Informações da Vistoria</span>
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Status</span>
            <span className="font-bold text-[#004777] uppercase text-xs">
              {vistoriaStatus === "CONCLUIDA" ? "Concluída" : "Em Andamento"}
            </span>
          </div>
          <div>
            <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Solicitante</span>
            <span className="font-bold text-[#280003]">{solicitante || "Não informado"}</span>
          </div>
          <div>
            <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Responsável</span>
            <span className="font-bold text-[#280003]">{vistoriador}</span>
          </div>
          <div>
            <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Proprietário</span>
            <span className="font-bold text-[#280003]">{proprietario}</span>
          </div>
        </div>
      </section>

      {/* 2. Localização das Chaves */}
      <section className="bg-white rounded-2xl border border-[#EEEEF3] p-5 sm:p-6 shadow-sm flex flex-col gap-3 print:border-none print:shadow-none print:p-0">
        <h3 className="text-base font-bold text-[#280003] flex items-center gap-2 border-b border-[#EEEEF3] pb-3 print:pb-1">
          <Key className="w-5 h-5 text-[#004777] print:hidden" />
          <span>Localização das Chaves</span>
        </h3>
        <div className="flex items-center gap-3">
          <div className="bg-[#004777]/5 px-3 py-1.5 rounded-lg border border-[#004777]/10 text-sm text-[#004777] font-bold">
            {chavesQuantidade} chave(s)
          </div>
          <p className="text-sm text-gray-700 font-medium">
            {chavesObservacao || "Nenhuma observação ou local de entrega registrado."}
          </p>
        </div>
      </section>

      {/* 3. PREVIEW DO RELATÓRIO COMPILADO (Parecer Geral + Ambientes & Fotos + Termos Gerais) */}
      <section className="bg-white rounded-2xl border border-[#EEEEF3] p-5 sm:p-6 shadow-sm flex flex-col gap-4 print:border-none print:shadow-none print:p-0">
        <h3 className="text-base font-bold text-[#280003] flex items-center gap-2 border-b border-[#EEEEF3] pb-3 print:pb-1">
          <Eye className="w-5 h-5 text-[#004777] print:hidden" />
          <span>Visualização Prévia do Laudo Técnico</span>
        </h3>

        <div className="border border-[#EEEEF3] rounded-xl p-5 bg-slate-50/50 flex flex-col gap-6 print:border-none print:bg-white print:p-0">
          
          {/* Parecer Técnico Geral */}
          <div>
            <h4 className="text-xs font-bold text-[#004777] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FileText className="w-4 h-4" />
              Parecer Técnico Geral
            </h4>
            <div className="bg-white p-4 rounded-lg border border-[#EEEEF3] text-sm text-gray-700 leading-relaxed white-space-pre-wrap print:border-none print:p-0">
              {reportDescription || <span className="text-gray-400 italic">Nenhum parecer geral cadastrado.</span>}
            </div>
            {reportObservation && (
              <div className="mt-3 p-3 bg-[#F0D18A]/10 border border-[#F0D18A]/20 rounded-lg text-xs text-[#8c6d1f] font-semibold leading-relaxed">
                <strong>Pontos de Atenção:</strong> {reportObservation}
              </div>
            )}
          </div>

          <div className="h-px bg-[#EEEEF3]" />

          {/* Estado dos Ambientes e Suas Fotos */}
          <div>
            <h4 className="text-xs font-bold text-[#004777] uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4" />
              Estado dos Ambientes & Registro Fotográfico
            </h4>

            <div className="flex flex-col gap-4">
              {rooms.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Nenhum ambiente adicionado a esta vistoria.</p>
              ) : (
                rooms.map((room) => {
                  // Filtrar fotos do ambiente nos comments
                  const roomComments = comments.filter(c => c.roomId === room.id);
                  const roomMedia = roomComments.flatMap(c => c.media || []);

                  return (
                    <div key={room.id} className="bg-white border border-[#EEEEF3] rounded-lg p-4 flex flex-col gap-3 shadow-xs print:break-inside-avoid print:border-b print:border-gray-200 print:rounded-none print:shadow-none print:px-0 print:py-4">
                      <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                        <strong className="text-sm text-[#280003]">{room.name}</strong>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold uppercase">
                          {room.type}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-gray-700">
                        <div>
                          <span className="block text-gray-400 font-bold uppercase text-[9px] tracking-wider mb-0.5">Visão Geral</span>
                          <p className="font-medium bg-gray-50 p-2 rounded border border-[#EEEEF3]">
                            {room.visaoGeral || <span className="text-gray-400 italic">Não descrita</span>}
                          </p>
                        </div>
                        <div>
                          <span className="block text-gray-400 font-bold uppercase text-[9px] tracking-wider mb-0.5">Observações</span>
                          <p className="font-medium bg-gray-50 p-2 rounded border border-[#EEEEF3]">
                            {room.comentarios || <span className="text-gray-400 italic">Sem observações adicionais</span>}
                          </p>
                        </div>
                      </div>

                      {/* Registro Fotográfico */}
                      {roomMedia.length > 0 && (
                        <div className="mt-2">
                          <span className="block text-gray-400 font-bold uppercase text-[9px] tracking-wider mb-2">Fotos Anexadas</span>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {roomMedia.map((media, idx) => (
                              <div key={idx} className="relative aspect-video rounded-lg overflow-hidden border border-[#EEEEF3] bg-gray-50 group">
                                {media.type === "image" ? (
                                  <PreviewableImage src={media.url} alt={`Foto do cômodo ${room.name}`} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                ) : (
                                  <video src={media.url} controls className="h-full w-full object-cover" />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="h-px bg-[#EEEEF3]" />

          {/* Informações Gerais / Termos Finais */}
          <div>
            <h4 className="text-xs font-bold text-[#004777] uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <CheckSquare className="w-4 h-4" />
              Termos e Condições Gerais do Laudo
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {infoGeralItems.map((item) => (
                <div key={item.id} className="bg-white border border-[#EEEEF3] rounded-lg p-3">
                  <span className="block text-[#004777] font-bold text-[10px] tracking-wider uppercase mb-1">
                    {item.titulo}
                  </span>
                  <div className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">
                    {item.conteudo || <span className="text-gray-400 italic">Não preenchido.</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* 4. Contestação (Apenas se houver) */}
      {vistoriaStatus === "CONTESTADA" && (
        <section className="bg-red-50/50 rounded-2xl border border-red-200/60 p-5 sm:p-6 shadow-sm flex flex-col gap-3 print:border-none print:shadow-none print:p-0">
          <h3 className="text-base font-bold text-red-700 flex items-center gap-2 border-b border-red-100 pb-3">
            <ShieldAlert className="w-5 h-5 text-red-600" />
            <span>Contestações do Relatório</span>
          </h3>
          <p className="text-sm text-red-800 leading-relaxed font-semibold">
            Este laudo técnico foi marcado como contestado e passará por nova revisão técnica junto à administração.
          </p>
        </section>
      )}

      {/* 5. Participantes que Assinaram (Apenas se houver assinatura na vistoria) */}
      {assinatura && (
        <section className="bg-white rounded-2xl border border-[#EEEEF3] p-5 sm:p-6 shadow-sm flex flex-col gap-6 print:border-none print:shadow-none print:p-0">
          <h3 className="text-base font-bold text-[#280003] flex items-center gap-2 border-b border-[#EEEEF3] pb-3 print:pb-1">
            <Users className="w-5 h-5 text-[#004777] print:hidden" />
            <span>Participantes e Assinaturas</span>
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-center pt-4">
            <div className="flex flex-col items-center">
              <div className="w-full max-w-[240px] border-b border-gray-400 h-10 flex items-end justify-center pb-1">
                <span className="text-xs font-bold text-[#004777]">Assinado Eletronicamente</span>
              </div>
              <strong className="text-xs text-[#280003] mt-2 block">{proprietario}</strong>
              <span className="text-[10px] text-gray-500 uppercase font-semibold">Proprietário</span>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-full max-w-[240px] border-b border-gray-400 h-10 flex items-end justify-center pb-1">
                <span className="text-xs font-bold text-[#004777]">Assinado Eletronicamente</span>
              </div>
              <strong className="text-xs text-[#280003] mt-2 block">{vistoriador}</strong>
              <span className="text-[10px] text-gray-500 uppercase font-semibold">Vistoriador Responsável</span>
            </div>
          </div>
        </section>
      )}

    </div>
  );
}
