"use client";

import { useState, useEffect } from "react";
import { 
  Calculator, 
  MessageSquare, 
  ShieldAlert, 
  BadgePercent, 
  Landmark, 
  Loader2, 
  MapPin, 
  Clock, 
  Home, 
  CheckCircle2, 
  PhoneCall, 
  Sparkles,
  Ruler
} from "lucide-react";
import { LotInfo } from "./SubdivisionMap";
import { createLead } from "@/app/actions/leadActions";

interface FinanceSimulatorProps {
  selectedLot: LotInfo | null;
}

export function FinanceSimulator({ selectedLot }: FinanceSimulatorProps) {
  // Valores padrão com base nos dados reais do Loteamento Village Parra
  // Lote padrão de 253 m² com valor total de R$ 95.400,00 (resultando em 180x de R$ 530,00)
  const lotPrice = selectedLot ? selectedLot.valorVenda : 9540000; // em centavos
  const lotPriceReal = lotPrice / 100;
  
  // Estado dos sliders (entrada inicia em 0% para mostrar a parcela inicial a partir de R$ 530,00 em 180x)
  const [downPaymentPercent, setDownPaymentPercent] = useState(0); 
  const [installmentsCount, setInstallmentsCount] = useState(180); // 15 anos (180 meses)
  const [includeBaloes, setIncludeBaloes] = useState(false);
  const [balaoValue, setBalaoValue] = useState(5000); // R$ 5.000 por ano

  // Estados do formulário de lead
  const [leadName, setLeadName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Resetar porcentagem de entrada ao mudar de lote
  useEffect(() => {
    setDownPaymentPercent(0);
  }, [selectedLot]);

  // Cálculos financeiros
  const discountRate = 0.10; // 10% de desconto à vista
  const cashPrice = lotPriceReal * (1 - discountRate);

  const downPaymentValue = lotPriceReal * (downPaymentPercent / 100);
  
  // Balões / Intercalares (1 por ano)
  const years = Math.floor(installmentsCount / 12);
  const totalBaloesValue = includeBaloes ? balaoValue * years : 0;

  // Saldo a financiar
  const remainingPrincipal = Math.max(0, lotPriceReal - downPaymentValue - totalBaloesValue);

  // Financiamento direto com a Construtora Parra (parcelamento facilitado)
  const monthlyInterestRate = 0; // Taxa nominal direta 0% base para parcelas a partir de R$ 530,00

  let monthlyInstallment = 0;
  if (remainingPrincipal > 0) {
    if (monthlyInterestRate > 0) {
      const pow = Math.pow(1 + monthlyInterestRate, installmentsCount);
      monthlyInstallment = remainingPrincipal * (monthlyInterestRate * pow) / (pow - 1);
    } else {
      monthlyInstallment = remainingPrincipal / installmentsCount;
    }
  }

  // Gerar link para o WhatsApp com resumo da simulação
  const handleWhatsAppClick = async () => {
    if (!leadName.trim() || !leadPhone.trim()) {
      setFormError("Por favor, preencha o Nome e o Telefone.");
      return;
    }
    setFormError("");
    setIsSubmitting(true);

    const phone = "5518996942082";
    const lotDesc = selectedLot 
      ? `Quadra ${selectedLot.quadra}, Lote ${selectedLot.loteNumero} (${selectedLot.area}m²)` 
      : "Lote Padrão Village Parra (253m²)";
    
    // Salvar o lead no banco de dados
    try {
      await createLead({
        nome: leadName,
        telefone: leadPhone,
        email: leadEmail,
        loteInfo: lotDesc,
        valorSimulado: monthlyInstallment,
        origem: "Village Parra - Simulador Oficial",
      });
    } catch (err) {
      console.error("Erro ao salvar lead em segundo plano:", err);
    }

    setIsSubmitting(false);

    const message = `Olá! Gostaria de atendimento exclusivo sobre o *Loteamento Village Parra*.

📍 *Localização:* Avenida Atlântica, S/N, Zona Sul - Ilha Solteira - SP
🏡 *Interesse:* ${lotDesc}

👤 *Nome:* ${leadName}
📞 *Telefone:* ${leadPhone}

📊 *Resumo da Simulação:*
• *Valor Total:* R$ ${lotPriceReal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
• *Entrada (${downPaymentPercent}%):* R$ ${downPaymentValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
• *Parcelamento Direto Construtora:* ${installmentsCount}x de *R$ ${monthlyInstallment.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}*
${includeBaloes ? `• *Balões Anuais:* ${years}x de R$ ${balaoValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n` : ""}
Gostaria de tirar dúvidas ou agendar uma visita no Plantão de Vendas (Sábado, 09h às 12h)!`;

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${phone}?text=${encodedMessage}`, "_blank");
  };

  return (
    <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 md:p-8 shadow-xl space-y-8">
      
      {/* 1. Header do Simulador com Marca e Dados Reais */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-3.5 bg-brand-primary/10 rounded-2xl text-brand-primary">
            <Calculator className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-brand-accent-gold/20 text-brand-text text-[10px] font-extrabold uppercase tracking-wider border border-brand-accent-gold/30">
                Financiamento Direto Parra
              </span>
            </div>
            <h3 className="text-2xl font-black text-brand-text mt-0.5">Simulador Village Parra</h3>
            <p className="text-xs md:text-sm text-brand-text/60 font-medium">
              Calcule as parcelas do seu terreno direto com a Construtora Parra Empreendimentos.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-brand-bg-primary/40 p-3 rounded-2xl border border-zinc-200/60">
          <div className="text-left">
            <span className="text-[10px] uppercase font-bold text-brand-text/50 block">Parcelas a partir de</span>
            <span className="text-xl font-black text-brand-primary">R$ 530,00 <span className="text-xs font-normal text-brand-text/60">/mês</span></span>
          </div>
          <div className="h-8 w-px bg-zinc-200 hidden sm:block"></div>
          <div className="text-left">
            <span className="text-[10px] uppercase font-bold text-brand-text/50 block">Prazo Facilitado</span>
            <span className="text-sm font-extrabold text-brand-text">Em até 180x</span>
          </div>
        </div>
      </div>

      {/* 2. Informações Oficiais do Imóvel & Plantão */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-brand-bg-primary/20 rounded-2xl border border-brand-bg-primary/40 text-xs">
        <div className="flex items-start gap-2.5">
          <MapPin className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-brand-text block">Localização</span>
            <span className="text-brand-text/70">Av. Atlântica, S/N, Zona Sul — Ilha Solteira/SP</span>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <Home className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-brand-text block">Ficha do Terreno</span>
            <span className="text-brand-text/70">0 Qtd • 0 Baet • 0 Vag • 253 m² área</span>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <Clock className="w-4 h-4 text-brand-accent-green shrink-0 mt-0.5" />
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

      {/* Lot Status Banner */}
      {!selectedLot && (
        <div className="bg-brand-accent-gold/15 text-brand-text/90 rounded-2xl p-4 flex gap-3 text-xs md:text-sm border border-brand-accent-gold/30 items-start">
          <Sparkles className="w-5 h-5 text-brand-text shrink-0 mt-0.5" />
          <div>
            <span className="font-extrabold text-brand-text">Simulação Base de Lote Padrão (253 m²):</span> Exibindo condições de R$ 95.400,00 com parcelas em 180x de <strong className="text-brand-primary font-black">R$ 530,00</strong>. Clique em qualquer lote do mapa para carregar o valor exato da quadra.
          </div>
        </div>
      )}

      {selectedLot && (
        <div className="bg-brand-primary/5 rounded-2xl p-4 flex items-center justify-between border border-brand-primary/15">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-primary/10 rounded-xl text-brand-primary">
              <Ruler className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-brand-primary block tracking-wider">Lote Selecionado no Mapa</span>
              <span className="text-base font-black text-brand-text">
                Quadra {selectedLot.quadra} — Lote {selectedLot.loteNumero} ({selectedLot.area} m²)
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-brand-text/50 block tracking-wider">Valor do Lote</span>
            <span className="text-xl font-black text-brand-primary">
              R$ {lotPriceReal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}

      {/* Grid: Sliders Controls vs Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Sliders Controls */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Slider 1: Entrada (Down Payment) */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-sm font-bold text-brand-text flex items-center gap-1.5">
                Valor da Entrada ({downPaymentPercent}%)
                {downPaymentPercent === 0 && (
                  <span className="text-[10px] bg-green-100 text-green-800 font-extrabold px-2 py-0.5 rounded-full">Sem Entrada</span>
                )}
              </label>
              
              {/* Campo numérico sincronizado */}
              <div className="relative w-full sm:w-44">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-brand-text/50">R$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={Math.round(downPaymentValue).toLocaleString("pt-BR")}
                  onChange={(e) => {
                    const valRaw = e.target.value.replace(/\D/g, "");
                    const valNum = Number(valRaw);
                    const valPercent = Math.min(90, Math.max(0, (valNum / lotPriceReal) * 100));
                    setDownPaymentPercent(Math.round(valPercent));
                  }}
                  className="w-full pl-8 pr-3 py-1.5 bg-brand-bg-primary/45 border border-zinc-200 focus:border-brand-primary rounded-xl text-right text-sm font-extrabold text-brand-primary focus:outline-none transition-colors"
                />
              </div>
            </div>
            
            <input
              type="range"
              min="0"
              max="90"
              step="5"
              value={downPaymentPercent}
              onChange={(e) => setDownPaymentPercent(Number(e.target.value))}
              className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-brand-primary"
            />
            <div className="flex justify-between text-[10px] font-bold text-brand-text/40">
              <span>Sem Entrada (0%)</span>
              <span>Médio (50%)</span>
              <span>Máximo (90%)</span>
            </div>
          </div>

          {/* Slider 2: Prazo (Months) */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-sm font-bold text-brand-text">
                Prazo de Financiamento (Até 180x)
              </label>
              
              {/* Campo numérico sincronizado */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="number"
                  min="12"
                  max="180"
                  step="12"
                  value={installmentsCount}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setInstallmentsCount(Math.min(180, Math.max(12, val)));
                  }}
                  className="w-20 px-2 py-1.5 bg-brand-bg-primary/45 border border-zinc-200 focus:border-brand-primary rounded-xl text-center text-sm font-extrabold text-brand-primary focus:outline-none transition-colors"
                />
                <span className="text-xs font-bold text-brand-text/50">meses ({(installmentsCount / 12).toFixed(0)} anos)</span>
              </div>
            </div>
            
            <input
              type="range"
              min="12"
              max="180"
              step="12"
              value={installmentsCount}
              onChange={(e) => setInstallmentsCount(Number(e.target.value))}
              className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-brand-primary"
            />
            <div className="flex justify-between text-[10px] font-bold text-brand-text/40">
              <span>12 meses (1 ano)</span>
              <span>96 meses (8 anos)</span>
              <span>180 meses (15 anos)</span>
            </div>
          </div>

          {/* Slider 3: Balões / Reforços Anuais (Opcional) */}
          <div className="bg-brand-bg-primary/30 p-4 rounded-2xl border border-brand-bg-primary/50 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="includeBaloes"
                  checked={includeBaloes}
                  onChange={(e) => setIncludeBaloes(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-primary border-zinc-300 focus:ring-brand-primary accent-brand-primary cursor-pointer"
                />
                <label htmlFor="includeBaloes" className="text-sm font-bold text-brand-text cursor-pointer select-none">
                  Incluir reforços anuais (Balões)
                </label>
              </div>
              {includeBaloes && (
                <span className="text-xs font-extrabold bg-brand-accent-gold/20 text-brand-text px-2.5 py-0.5 rounded-full border border-brand-accent-gold/40">
                  {years} parcelas balão
                </span>
              )}
            </div>

            {includeBaloes && (
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs text-brand-text/70">Valor de cada Balão (1 por ano):</span>
                  
                  <div className="relative w-full sm:w-36">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-brand-text/50">R$</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={balaoValue.toLocaleString("pt-BR")}
                      onChange={(e) => {
                        const valRaw = e.target.value.replace(/\D/g, "");
                        setBalaoValue(Math.min(50000, Math.max(1000, Number(valRaw))));
                      }}
                      className="w-full pl-8 pr-3 py-1 bg-brand-bg-primary/45 border border-zinc-200 focus:border-brand-primary rounded-xl text-right text-xs font-extrabold text-brand-text focus:outline-none transition-colors"
                    />
                  </div>
                </div>
                <input
                  type="range"
                  min="2000"
                  max="20000"
                  step="1000"
                  value={balaoValue}
                  onChange={(e) => setBalaoValue(Number(e.target.value))}
                  className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-brand-primary"
                />
                <span className="text-[10px] text-brand-text/50 block leading-snug">
                  * Balões reduzem o valor das parcelas mensais. Total de balões no período: R$ {totalBaloesValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Simulation Results / Lead Form */}
        <div className="lg:col-span-5 flex flex-col justify-between bg-brand-text text-white p-6 md:p-8 rounded-3xl shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:12px_12px]"></div>
          
          <div className="relative z-10 space-y-6">
            
            {/* Opção à Vista */}
            <div className="border-b border-white/10 pb-5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-brand-accent-gold text-xs font-bold uppercase tracking-wider">
                <BadgePercent className="w-4 h-4" />
                Pagamento à Vista (10% OFF)
              </div>
              <div className="text-3xl font-black text-white tracking-tight">
                R$ {cashPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-white/60 font-light">
                Economia de R$ {(lotPriceReal * discountRate).toLocaleString("pt-BR")} no pagamento à vista.
              </p>
            </div>

            {/* Opção Financiada Construtora Parra */}
            <div className="space-y-4">
              <div className="flex items-center gap-1.5 text-brand-accent-gold text-xs font-bold uppercase tracking-wider">
                <Landmark className="w-4 h-4 text-brand-accent-gold" />
                Financiamento Construtora Parra
              </div>
              
              <div className="space-y-1">
                <span className="text-xs text-white/60 block font-light">Valor da Parcela Mensal</span>
                <div className="text-3xl md:text-4xl font-black text-brand-accent-gold tracking-tight">
                  R$ {monthlyInstallment.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </div>
                <span className="text-[10px] text-white/50 block font-light">
                  {installmentsCount} parcelas mensais facilitadas direto com a loteadora.
                </span>
              </div>

              {/* Detalhes de Entrada */}
              <div className="grid grid-cols-2 gap-4 pt-3 text-xs border-t border-white/10">
                <div>
                  <span className="text-white/50 block text-[10px] uppercase font-semibold">Entrada ({downPaymentPercent}%)</span>
                  <span className="font-extrabold text-white">R$ {downPaymentValue.toLocaleString("pt-BR")}</span>
                </div>
                {includeBaloes && (
                  <div>
                    <span className="text-white/50 block text-[10px] uppercase font-semibold">Balões ({years}x)</span>
                    <span className="font-extrabold text-white">R$ {balaoValue.toLocaleString("pt-BR")} /ano</span>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Action CTA & Lead Form */}
          <div className="pt-6 border-t border-white/10 space-y-3.5 relative z-10 text-left">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-brand-accent-gold uppercase tracking-wider">Fale com a Scatolin Imóveis</h4>
              <span className="text-[10px] text-white/50">(18) 99694-2082</span>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-white/70 block">Nome Completo</label>
              <input
                type="text"
                placeholder="Digite seu nome completo"
                value={leadName}
                onChange={(e) => setLeadName(e.target.value)}
                className="w-full px-3.5 py-2 bg-white/10 border border-white/15 focus:border-brand-accent-gold focus:outline-none rounded-xl text-sm text-white placeholder-white/40 transition-colors"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-white/70 block">Telefone / WhatsApp</label>
              <input
                type="text"
                placeholder="(18) 99694-2082"
                value={leadPhone}
                onChange={(e) => setLeadPhone(e.target.value)}
                className="w-full px-3.5 py-2 bg-white/10 border border-white/15 focus:border-brand-accent-gold focus:outline-none rounded-xl text-sm text-white placeholder-white/40 transition-colors"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-white/70 block">E-mail (Opcional)</label>
              <input
                type="email"
                placeholder="seuemail@exemplo.com"
                value={leadEmail}
                onChange={(e) => setLeadEmail(e.target.value)}
                className="w-full px-3.5 py-2 bg-white/10 border border-white/15 focus:border-brand-accent-gold focus:outline-none rounded-xl text-sm text-white placeholder-white/40 transition-colors"
                disabled={isSubmitting}
              />
            </div>
            
            {formError && (
              <span className="text-[10px] text-red-300 font-bold block bg-red-950/50 p-2 rounded-lg border border-red-800/40 text-center">
                {formError}
              </span>
            )}

            <button
              onClick={handleWhatsAppClick}
              disabled={isSubmitting}
              className="w-full py-4 mt-2 rounded-xl bg-brand-primary text-white hover:bg-brand-primary/95 font-bold text-sm shadow-lg shadow-brand-primary/20 flex items-center justify-center gap-2 group transition-all duration-300 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <MessageSquare className="w-4 h-4 fill-current" />
              )}
              {isSubmitting ? "Enviando Simulação..." : "Simular e Reservar no WhatsApp"}
            </button>
            
            <div className="flex items-center justify-center gap-1.5 text-[9px] text-white/50 text-center pt-1 font-light">
              <CheckCircle2 className="w-3 h-3 text-brand-accent-green shrink-0" />
              <span>Plantão aos sábados (09h-12h) em frente ao Village Parra 1.</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

