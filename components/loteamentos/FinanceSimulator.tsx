"use client";

import { useState, useEffect } from "react";
import {
  MessageSquare,
  Loader2,
  MapPin,
  CheckCircle2,
  PhoneCall,
  Sparkles,
  Ruler,
  Coins,
  Calendar,
  ArrowUpRight
} from "lucide-react";
import { LotInfo } from "./SubdivisionMap";
import { createLead } from "@/app/actions/leadActions";

interface FinanceSimulatorProps {
  selectedLot: LotInfo | null;
}

export function FinanceSimulator({ selectedLot }: FinanceSimulatorProps) {
  // Estados do formulário de lead
  const [leadName, setLeadName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Resetar estados de erro/sucesso ao mudar de lote
  useEffect(() => {
    setSuccess(false);
    setFormError("");
  }, [selectedLot]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadName.trim() || !leadPhone.trim()) {
      setFormError("Por favor, preencha o Nome e o Telefone.");
      return;
    }
    setFormError("");
    setIsSubmitting(true);

    const lotDesc = selectedLot
      ? `Quadra ${selectedLot.quadra === "D_EXT" ? "D (Ext)" : selectedLot.quadra}, Lote ${selectedLot.loteNumero} (${selectedLot.area}m²)`
      : "Lote Geral - Village Parra";

    try {
      const res = await createLead({
        nome: leadName,
        telefone: leadPhone,
        email: leadEmail || null,
        loteInfo: `Loteamento Village Parra - Interesse de Compra - ${lotDesc}`,
        valorSimulado: 577, // R$ 577,00
        origem: "Village Parra - Site Público (Condições de Pagamento)",
      });

      if (res.success) {
        setSuccess(true);
        // WhatsApp redirection
        const phone = "5518996942082";
        const message = `Olá! Enviei meu interesse pelo site e gostaria de saber mais sobre as condições de pagamento do Loteamento Village Parra.

📌 *Condições de Interesse:* Parcela de R$ 577,00 em 156x com Entrada Facilitada.
${selectedLot ? `🏡 *Lote Selecionado:* Quadra ${selectedLot.quadra === "D_EXT" ? "D (Ext)" : selectedLot.quadra}, Lote ${selectedLot.loteNumero} (${selectedLot.area}m²)` : ""}
👤 *Nome:* ${leadName}
📞 *Telefone:* ${leadPhone}
${leadEmail ? `📧 *E-mail:* ${leadEmail}` : ""}`;

        const encodedMessage = encodeURIComponent(message);
        window.open(`https://wa.me/${phone}?text=${encodedMessage}`, "_blank");
      } else {
        setFormError(res.error || "Erro ao salvar o interesse. Tente novamente.");
      }
    } catch (err) {
      console.error("Erro ao enviar lead:", err);
      setFormError("Erro de conexão. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Grade de Condições de Pagamento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Parcela */}
        <div className="bg-brand-bg-primary/30 border border-brand-bg-primary/70 rounded-2xl p-6 text-center space-y-2 relative group hover:border-brand-primary/20 transition-all duration-300">
          <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary mx-auto">
            <Coins className="w-5 h-5" />
          </div>
          <span className="text-[10px] uppercase font-bold text-brand-text/50 tracking-wider block">Parcela Mensal</span>
          <div className="text-3xl font-black text-brand-primary">R$ 577,00</div>
          <p className="text-xs text-brand-text/60 font-light">Valores fixos e suaves para caber no seu orçamento.</p>
        </div>

        {/* Prazo */}
        <div className="bg-brand-bg-primary/30 border border-brand-bg-primary/70 rounded-2xl p-6 text-center space-y-2 relative group hover:border-brand-primary/20 transition-all duration-300">
          <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary mx-auto">
            <Calendar className="w-5 h-5" />
          </div>
          <span className="text-[10px] uppercase font-bold text-brand-text/50 tracking-wider block">Prazo Facilitado</span>
          <div className="text-3xl font-black text-brand-primary">Até 156x</div>
          <p className="text-xs text-brand-text/60 font-light">Financiamento direto e rápido com a construtora.</p>
        </div>

        {/* Entrada */}
        <div className="bg-brand-bg-primary/30 border border-brand-bg-primary/70 rounded-2xl p-6 text-center space-y-2 relative group hover:border-brand-primary/20 transition-all duration-300">
          <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary mx-auto">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="text-[10px] uppercase font-bold text-brand-text/50 tracking-wider block">Flexibilidade</span>
          <div className="text-2xl font-black text-brand-primary pt-1">Entrada Facilitada</div>
          <p className="text-xs text-brand-text/60 font-light">Condições especiais de sinal para você fechar negócio.</p>
        </div>

      </div>

      {/* Info complementar de Plantão e Contatos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-brand-bg-primary/20 rounded-2xl border border-brand-bg-primary/40 text-xs">
        <div className="flex items-start gap-2.5">
          <MapPin className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-brand-text block">Localização</span>
            <span className="text-brand-text/70">Av. Atlântica, S/N, Zona Sul — Ilha Solteira/SP</span>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <Ruler className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-brand-text block">Dimensão dos Terrenos</span>
            <span className="text-brand-text/70">Lotes a partir de 253 m²</span>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <Calendar className="w-4 h-4 text-brand-accent-green shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-brand-text block">Plantão de Vendas</span>
            <span className="text-brand-text/70">Sábados, 09h às 12h (Village Parra 1)</span>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <PhoneCall className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-brand-text block">Vendas Exclusivas</span>
            <span className="text-brand-text/70">Scatolin Imóveis • (18) 99694-2082</span>
          </div>
        </div>
      </div>

      {/* Lote Selecionado no Mapa */}
      {selectedLot && (
        <div className="bg-brand-primary/5 rounded-2xl p-4 flex items-center justify-between border border-brand-primary/15 animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-primary/10 rounded-xl text-brand-primary">
              <Ruler className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-brand-primary block tracking-wider">Lote Selecionado no Mapa</span>
              <span className="text-base font-black text-brand-text">
                Quadra {selectedLot.quadra === "D_EXT" ? "D (Ext)" : selectedLot.quadra} — Lote {selectedLot.loteNumero} ({selectedLot.area} m²)
              </span>
            </div>
          </div>
          <span className="px-3 py-1 text-xs font-bold bg-brand-primary text-white rounded-full">
            Selecionado
          </span>
        </div>
      )}

      {/* Lead Form vs WhatsApp CTA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Formulário de Lead (CRM) */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 bg-white border border-zinc-200/80 rounded-3xl p-6 md:p-8 shadow-md space-y-5">
          <div>
            <h4 className="font-extrabold text-brand-text text-base">Tenho Interesse</h4>
            <p className="text-xs text-brand-text/60 mt-1">Preencha seus dados para receber uma proposta personalizada no WhatsApp e registrar seu contato no CRM.</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-brand-text/70 block">Nome Completo</label>
              <input
                type="text"
                placeholder="Digite seu nome completo"
                value={leadName}
                onChange={(e) => setLeadName(e.target.value)}
                className="w-full px-4 py-2.5 bg-brand-bg-primary/30 border border-zinc-200 focus:border-brand-primary focus:outline-none rounded-xl text-sm text-brand-text placeholder-brand-text/40 transition-all font-medium"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-brand-text/70 block">WhatsApp / Telefone</label>
              <input
                type="text"
                placeholder="(18) 99694-2082"
                value={leadPhone}
                onChange={(e) => setLeadPhone(e.target.value)}
                className="w-full px-4 py-2.5 bg-brand-bg-primary/30 border border-zinc-200 focus:border-brand-primary focus:outline-none rounded-xl text-sm text-brand-text placeholder-brand-text/40 transition-all font-medium"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-brand-text/70 block">E-mail (Opcional)</label>
              <input
                type="email"
                placeholder="seuemail@exemplo.com"
                value={leadEmail}
                onChange={(e) => setLeadEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-brand-bg-primary/30 border border-zinc-200 focus:border-brand-primary focus:outline-none rounded-xl text-sm text-brand-text placeholder-brand-text/40 transition-all font-medium"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {formError && (
            <span className="text-[10px] text-red-700 font-bold block bg-red-50 p-2.5 rounded-xl border border-red-200 text-center animate-shake">
              {formError}
            </span>
          )}

          {success && (
            <span className="text-[10px] text-brand-primary font-bold block bg-green-50 p-2.5 rounded-xl border border-green-200 text-center">
              Interesse registrado no CRM! Redirecionando para o WhatsApp...
            </span>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 rounded-xl bg-brand-primary hover:bg-brand-primary/95 text-white font-bold text-sm shadow-lg shadow-brand-primary/20 flex items-center justify-center gap-2 group transition-all duration-300 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed h-12"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <MessageSquare className="w-4 h-4 fill-current" />
            )}
            {isSubmitting ? "Processando..." : "Receber Proposta no WhatsApp"}
          </button>
        </form>

        {/* WhatsApp Direto da Empresa */}
        <div className="lg:col-span-5 flex flex-col justify-between bg-brand-text text-white p-6 md:p-8 rounded-3xl shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:12px_12px]"></div>

          <div className="relative z-10 space-y-5">
            <div className="flex items-center gap-2 text-brand-accent-gold text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              Atendimento Imediato
            </div>
            <h4 className="text-xl md:text-2xl font-black text-white tracking-tight">Quer Falar Direto Com Um Corretor?</h4>
            <p className="text-xs text-white/70 leading-relaxed font-light">
              Clique no botão abaixo para iniciar uma conversa direta no nosso canal oficial do WhatsApp sem precisar preencher o formulário. Tire suas dúvidas sobre documentação, visitas e reservas.
            </p>
          </div>

          <div className="pt-6 relative z-10">
            <a
              href="https://wa.me/5518996942082?text=Olá!%20Gostaria%20de%20tirar%20dúvidas%20sobre%20as%20condições%20de%20pagamento%20do%20Loteamento%20Village%20Parra."
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 rounded-xl bg-brand-primary hover:bg-brand-primary/95 text-white font-bold text-sm shadow-lg shadow-brand-primary/20 flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer"
            >
              Falar Conosco no WhatsApp
              <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
