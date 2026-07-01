"use client";

import { useState, useTransition } from "react";
import { updateLeadStatus } from "@/app/actions/leadActions";
import { LeadStatus } from "@/generated/prisma";
import { Phone, Mail, MessageSquare, Calendar, DollarSign, MapPin, ArrowLeft, ArrowRight, Trash2, Search, Sparkles } from "lucide-react";

// Definição dos tipos locais compatíveis com o Prisma
interface Lead {
  id: string;
  nome: string;
  telefone: string;
  email: string | null;
  loteInfo: string | null;
  valorSimulado: number | null;
  status: LeadStatus;
  origem: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CrmKanbanBoardProps {
  initialLeads: any[]; // tipo vindo do prisma
}

const COLUMNS: { status: LeadStatus; label: string; bg: string; text: string; border: string }[] = [
  { status: "NOVO", label: "Novos Leads", bg: "bg-blue-50/50", text: "text-blue-700", border: "border-blue-200" },
  { status: "EM_ATENDIMENTO", label: "Em Contato", bg: "bg-purple-50/50", text: "text-purple-700", border: "border-purple-200" },
  { status: "VISITA_AGENDADA", label: "Visita Agendada", bg: "bg-amber-50/50", text: "text-amber-700", border: "border-amber-200" },
  { status: "FECHADO", label: "Fechado / Ganho", bg: "bg-emerald-50/50", text: "text-emerald-700", border: "border-emerald-200" },
];

export function CrmKanbanBoard({ initialLeads }: CrmKanbanBoardProps) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads as Lead[]);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  // Filtrar leads por pesquisa (nome, fone, e-mail ou lote)
  const filteredLeads = leads.filter((lead) => {
    const term = search.toLowerCase();
    return (
      lead.nome.toLowerCase().includes(term) ||
      lead.telefone.includes(term) ||
      (lead.email && lead.email.toLowerCase().includes(term)) ||
      (lead.loteInfo && lead.loteInfo.toLowerCase().includes(term))
    );
  });

  // Mover lead entre as colunas do funil
  const handleMoveStatus = async (leadId: string, currentStatus: LeadStatus, direction: "left" | "right" | "trash") => {
    const currentIndex = COLUMNS.findIndex((c) => c.status === currentStatus);
    let nextStatus: LeadStatus = currentStatus;

    if (direction === "left" && currentIndex > 0) {
      nextStatus = COLUMNS[currentIndex - 1].status;
    } else if (direction === "right" && currentIndex < COLUMNS.length - 1) {
      nextStatus = COLUMNS[currentIndex + 1].status;
    } else if (direction === "trash") {
      nextStatus = "PERDIDO";
    }

    if (nextStatus === currentStatus && direction !== "trash") return;

    // Atualização otimista local
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: nextStatus } : l))
    );

    // Persistir no banco de dados via Server Action
    startTransition(async () => {
      const res = await updateLeadStatus(leadId, nextStatus);
      if (!res.success) {
        // Reverter em caso de falha
        setLeads((prev) =>
          prev.map((l) => (l.id === leadId ? { ...l, status: currentStatus } : l))
        );
        alert("Não foi possível atualizar o status do lead.");
      }
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Barra de Filtros e Pesquisa */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 border border-zinc-200/80 rounded-2xl shadow-sm">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Pesquisar por nome, telefone ou lote..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-zinc-200 focus:border-brand-primary rounded-xl text-sm placeholder-zinc-400 focus:outline-none transition-colors"
          />
        </div>
        
        <div className="flex items-center gap-2 text-xs text-brand-text/50">
          <Sparkles className="w-4 h-4 text-brand-accent-gold" />
          <span>Total de Leads Ativos no Funil: {leads.filter(l => l.status !== "PERDIDO").length}</span>
        </div>
      </div>

      {/* Grid do Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        
        {COLUMNS.map((col) => {
          // Filtrar os leads pertencentes a esta coluna
          const colLeads = filteredLeads.filter((l) => l.status === col.status);

          return (
            <div 
              key={col.status}
              className={`rounded-2xl border ${col.border} ${col.bg} p-4 flex flex-col gap-4 min-h-[500px] shadow-sm`}
            >
              {/* Header da Coluna */}
              <div className="flex items-center justify-between border-b pb-3 border-zinc-200/50">
                <h3 className={`font-bold text-sm ${col.text}`}>{col.label}</h3>
                <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${col.text} bg-white border border-current/20 shadow-sm`}>
                  {colLeads.length}
                </span>
              </div>

              {/* Cards da Coluna */}
              <div className="flex flex-col gap-3 overflow-y-auto max-h-[650px] pr-1">
                {colLeads.length === 0 ? (
                  <div className="text-center py-10 text-zinc-400 text-xs border border-dashed border-zinc-300/60 rounded-xl">
                    Sem leads nesta etapa
                  </div>
                ) : (
                  colLeads.map((lead) => {
                    const formattedDate = new Date(lead.createdAt).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                    });
                    
                    return (
                      <div 
                        key={lead.id}
                        className="bg-white border border-zinc-200/80 rounded-xl p-4 shadow-sm hover:shadow transition-all space-y-3.5 group relative"
                      >
                        {/* Origem/Badge superior */}
                        <div className="flex items-center justify-between text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
                          <span>{lead.origem}</span>
                          <span>{formattedDate}</span>
                        </div>

                        {/* Nome do Lead */}
                        <div>
                          <h4 className="font-extrabold text-sm text-brand-text group-hover:text-brand-primary transition-colors">
                            {lead.nome}
                          </h4>
                        </div>

                        {/* Detalhes de Interesse (Lote e Valor) */}
                        <div className="bg-brand-bg-primary/30 p-2.5 rounded-lg border border-brand-bg-primary/50 text-xs space-y-1.5">
                          {lead.loteInfo && (
                            <div className="flex items-center gap-1.5 text-brand-text/80 font-medium">
                              <MapPin className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                              <span className="truncate">{lead.loteInfo}</span>
                            </div>
                          )}
                          {lead.valorSimulado && (
                            <div className="flex items-center gap-1.5 text-brand-primary font-bold">
                              <DollarSign className="w-3.5 h-3.5 shrink-0" />
                              <span>Parcela: R$ {lead.valorSimulado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/mês</span>
                            </div>
                          )}
                        </div>

                        {/* Canais de Contato Rápido */}
                        <div className="flex items-center gap-2 text-xs">
                          {/* Botão de WhatsApp */}
                          <a 
                            href={`https://wa.me/55${lead.telefone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-1 flex-1 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 font-bold border border-green-200 rounded-lg transition-colors"
                          >
                            <MessageSquare className="w-3.5 h-3.5 fill-current" />
                            Conversar
                          </a>
                          
                          {/* Botão de Ligação */}
                          <a 
                            href={`tel:${lead.telefone}`}
                            className="flex items-center justify-center gap-1 px-3 py-1.5 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 font-bold border border-zinc-200 rounded-lg transition-colors"
                            title="Ligar para o Lead"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        </div>

                        {/* Controles do Kanban (Ações de Arraste/Movimentação) */}
                        <div className="flex items-center justify-between border-t border-zinc-100 pt-2.5 mt-2.5">
                          <button
                            onClick={() => handleMoveStatus(lead.id, col.status, "trash")}
                            className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Arquivar/Perder Lead"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          
                          <div className="flex items-center gap-1">
                            {/* Mover para a esquerda */}
                            {col.status !== "NOVO" && (
                              <button
                                onClick={() => handleMoveStatus(lead.id, col.status, "left")}
                                className="p-1.5 text-zinc-400 hover:text-brand-primary hover:bg-brand-bg-primary/50 rounded-lg border border-zinc-100 shadow-sm transition-colors bg-zinc-50"
                                title="Mover para coluna anterior"
                              >
                                <ArrowLeft className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Mover para a direita */}
                            {col.status !== "FECHADO" && (
                              <button
                                onClick={() => handleMoveStatus(lead.id, col.status, "right")}
                                className="p-1.5 text-zinc-400 hover:text-brand-primary hover:bg-brand-bg-primary/50 rounded-lg border border-zinc-100 shadow-sm transition-colors bg-zinc-50"
                                title="Mover para próxima coluna"
                              >
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}

      </div>
    </div>
  );
}
