import { prisma } from "@/lib/prisma";
import { LoteamentoClient } from "./LoteamentoClient";
import { LotInfo } from "@/components/loteamentos/SubdivisionMap";
import { Compass, ShieldCheck, Map, Trees, Award, Building, CheckCircle, MapPin, Calendar, HelpCircle } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Loteamento Village Parra | Ilha Solteira - SP",
  description: "Terrenos a partir de 253 m² ao lado do Residencial Portal do Sol e em frente ao Beach Tennis. Condições facilitadas de pagamento com parcelas em até 156x a partir de R$ 577,00 direto com a construtora.",
};

export default async function LoteamentosPage() {
  // Buscar loteamento Village Parra no banco
  const loteamento = await prisma.loteamento.findUnique({
    where: { slug: "village-parra" },
    include: {
      lotes: {
        orderBy: [
          { quadra: "asc" },
          { loteNumero: "asc" },
        ],
      },
    },
  });

  const defaultLots: LotInfo[] = [];

  const lots: LotInfo[] = loteamento
    ? loteamento.lotes.map((l) => ({
        id: l.id,
        codigo: l.codigo,
        quadra: l.quadra || "",
        loteNumero: l.loteNumero || "",
        area: l.area,
        topografia: l.topografia || "PLANO",
        valorVenda: l.valorVenda || 0,
        statusLote: l.statusLote as "DISPONIVEL" | "RESERVADO" | "VENDIDO",
      }))
    : defaultLots;

  const coordsJson = loteamento?.coordenadasSvg as { mapaUrl?: string } | null;
  const mapaUrl = coordsJson?.mapaUrl || null;

  return (
    <div className="min-h-screen bg-brand-bg-primary/20 space-y-0">
      
      {/* 1. Hero Section com Efeitos Visuais */}
      <section className="relative h-[70vh] min-h-[500px] bg-brand-text text-white flex items-center justify-center overflow-hidden">
        {/* Imagem de Fundo Aérea */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105 transition-transform duration-10000 opacity-55"
          style={{ backgroundImage: `url('/loteamentos/image.png')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-text via-brand-text/50 to-transparent" />
        
        {/* Conteúdo Hero */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 text-center space-y-6">
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-brand-accent-gold/20 border border-brand-accent-gold/30 text-brand-accent-gold text-xs font-bold uppercase tracking-widest animate-pulse">
            <Compass className="w-4 h-4" />
            Lançamento de Lotes em Ilha Solteira
          </span>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight drop-shadow-md">
            Loteamento <span className="text-brand-accent-gold font-black">Village Parra</span>
          </h1>
          <p className="text-sm md:text-lg text-white/90 max-w-2xl mx-auto leading-relaxed font-light drop-shadow-sm">
            O espaço perfeito para você construir o seu futuro. Localização privilegiada ao lado do Residencial Portal do Sol e em frente ao Beach Tennis. Terrenos amplos com parcelamento em até 156x!
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <a 
              href="#mapa-section"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-brand-primary text-white font-bold text-sm shadow-lg hover:shadow-xl hover:bg-brand-primary/95 transition-all cursor-pointer"
            >
              Lotes Disponíveis
            </a>
            <a 
              href="#pagamento-section"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white/10 text-white font-bold text-sm border border-white/20 hover:bg-white/20 transition-all cursor-pointer"
            >
              Condições de Pagamento
            </a>
          </div>
        </div>
      </section>

      {/* 2. Galeria de Imagens com Efeitos de Zoom (Efeito visual premium) */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="space-y-2 text-center md:text-left">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-primary">Galeria Exclusiva</span>
            <h2 className="text-3xl font-extrabold text-brand-text">Imagens do Loteamento</h2>
            <p className="text-sm text-brand-text/60 max-w-md">Confira a infraestrutura completa e a excelente localização das quadras.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Foto 1 (Principal) */}
            <div className="md:col-span-2 overflow-hidden rounded-2xl border border-zinc-200/80 shadow-md aspect-[16/10] bg-zinc-100 group relative">
              <img 
                src="/loteamentos/image.png" 
                alt="Village Parra - Vista Geral" 
                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-text/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                <div>
                  <h4 className="text-white font-bold text-base">Vista Panorâmica Geral</h4>
                  <p className="text-white/70 text-xs font-light">Lotes amplos prontos para construir.</p>
                </div>
              </div>
            </div>
            
            {/* Fotos 2 e 3 na lateral */}
            <div className="grid grid-cols-1 gap-6">
              <div className="overflow-hidden rounded-2xl border border-zinc-200/80 shadow-md aspect-[16/10] bg-zinc-100 group relative">
                <img 
                  src="/loteamentos/image copy.png" 
                  alt="Village Parra - Vista Lateral" 
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-text/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                  <div>
                    <h4 className="text-white font-bold text-sm">Vista das Quadras</h4>
                    <p className="text-white/70 text-[10px] font-light">Topografia excelente.</p>
                  </div>
                </div>
              </div>
              
              <div className="overflow-hidden rounded-2xl border border-zinc-200/80 shadow-md aspect-[16/10] bg-zinc-100 group relative">
                <img 
                  src="/loteamentos/image copy 2.png" 
                  alt="Village Parra - Área Comercial" 
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-text/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                  <div>
                    <h4 className="text-white font-bold text-sm">Infraestrutura em Finalização</h4>
                    <p className="text-white/70 text-[10px] font-light">Drenagem e asfalto concluídos.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Destaques e Diferenciais */}
      <section className="py-16 bg-brand-bg-primary/20 border-y border-zinc-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          
          <div className="flex gap-4 p-5 rounded-2xl bg-white border border-zinc-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group">
            <MapPin className="w-10 h-10 text-brand-accent-green shrink-0 group-hover:scale-110 transition-transform" />
            <div>
              <h4 className="font-extrabold text-brand-text text-base">Localização Exclusiva</h4>
              <p className="text-xs text-brand-text/60 leading-relaxed mt-1">Ao lado do Portal do Sol e bem em frente ao Beach Tennis na Zona Sul.</p>
            </div>
          </div>

          <div className="flex gap-4 p-5 rounded-2xl bg-white border border-zinc-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group">
            <Award className="w-10 h-10 text-brand-accent-gold shrink-0 group-hover:scale-110 transition-transform" />
            <div>
              <h4 className="font-extrabold text-brand-text text-base">Terrenos Amplos</h4>
              <p className="text-xs text-brand-text/60 leading-relaxed mt-1">Lotes a partir de 253 m² (aprox. 20x13m) de excelente aproveitamento útil.</p>
            </div>
          </div>

          <div className="flex gap-4 p-5 rounded-2xl bg-white border border-zinc-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group">
            <ShieldCheck className="w-10 h-10 text-brand-primary shrink-0 group-hover:scale-110 transition-transform" />
            <div>
              <h4 className="font-extrabold text-brand-text text-base">Financiamento Direto</h4>
              <p className="text-xs text-brand-text/60 leading-relaxed mt-1">Parcelas facilitadas em até 156x direto com a Construtora Parra Empreendimentos.</p>
            </div>
          </div>

          <div className="flex gap-4 p-5 rounded-2xl bg-white border border-zinc-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group">
            <Calendar className="w-10 h-10 text-brand-primary shrink-0 group-hover:scale-110 transition-transform" />
            <div>
              <h4 className="font-extrabold text-brand-text text-base">Plantão aos Sábados</h4>
              <p className="text-xs text-brand-text/60 leading-relaxed mt-1">Das 09h às 12h, em frente ao Village Parra 1, exclusivo pela Scatolin Imóveis.</p>
            </div>
          </div>

        </div>
      </section>

      {/* 4. Descrição Geral */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 space-y-6">
          <div className="space-y-2 text-center md:text-left">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-primary">Sobre o Empreendimento</span>
            <h2 className="text-3xl font-extrabold text-brand-text leading-tight">Village Parra: Construa Seu Futuro Aqui</h2>
          </div>
          <div className="text-brand-text/80 text-sm md:text-base leading-relaxed space-y-4 font-light text-justify md:text-left">
            <p>
              O Loteamento Village Parra é o novo endereço dos seus sonhos, em uma localização privilegiada, ao lado do Residencial Portal do Sol e bem em frente ao Beach Tennis. Os lotes estão incríveis, com condições imperdíveis.
            </p>
            <p>
              São terrenos amplos, a partir de 253 m², equivalentes a um lote de aproximadamente 20 x 13 metros, perfeitos para quem busca espaço e conforto. As condições de pagamento são facilitadas, com parcelas em até 156x e valores a partir de R$ 577,00.
            </p>
            <p>
              O financiamento é direto com a construtora Parra Empreendimentos, garantindo praticidade e segurança na hora de comprar o seu terreno. O Village Parra é ideal tanto para quem deseja morar bem, quanto para quem quer investir com tranquilidade e valorização garantida.
            </p>
          </div>
        </div>
      </section>



      {/* 6. Interactive Section (Client coordinator wrapper) */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3 max-w-xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-primary">Lotes Disponíveis</span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-brand-text font-black">Escolha seu Lote no Mapa</h2>
          <p className="text-sm text-brand-text/60">
            Navegue pelas quadras e lotes coloridos abaixo para verificar quais unidades ainda estão disponíveis (Azul/Amarelo) ou vendidas (Vermelho).
          </p>
        </div>

        {/* Client component holding the map and simulator state */}
        <LoteamentoClient initialLots={lots} mapaUrl={mapaUrl} />
      </section>

      {/* 7. FAQ Section */}
      <section className="py-20 bg-white border-t border-zinc-100">
        <div className="max-w-4xl mx-auto px-4 space-y-12">
          <div className="text-center space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-primary">Dúvidas</span>
            <h2 className="text-3xl font-extrabold text-brand-text">Perguntas Frequentes</h2>
            <p className="text-sm text-brand-text/60">Esclareça suas dúvidas rápidas sobre o loteamento e o financiamento.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="bg-brand-bg-primary/20 p-6 rounded-2xl space-y-2 border border-brand-bg-primary/30">
              <h4 className="font-bold text-brand-text flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-brand-accent-green shrink-0" />
                Como funciona o parcelamento em até 156x?
              </h4>
              <p className="text-xs text-brand-text/75 leading-relaxed font-light">
                O parcelamento é facilitado com parcelas suaves diretamente com a loteadora Parra Empreendimentos, permitindo pagamentos mensais a partir de R$ 577,00.
              </p>
            </div>

            <div className="bg-brand-bg-primary/20 p-6 rounded-2xl space-y-2 border border-brand-bg-primary/30">
              <h4 className="font-bold text-brand-text flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-brand-accent-green shrink-0" />
                Onde fica exatamente o Village Parra?
              </h4>
              <p className="text-xs text-brand-text/75 leading-relaxed font-light">
                Fica na Avenida Atlântica, S/N, na Zona Sul de Ilha Solteira/SP, localizado ao lado do Residencial Portal do Sol e em frente à arena de Beach Tennis.
              </p>
            </div>

            <div className="bg-brand-bg-primary/20 p-6 rounded-2xl space-y-2 border border-brand-bg-primary/30">
              <h4 className="font-bold text-brand-text flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-brand-accent-green shrink-0" />
                Qual o plantão de atendimento no local?
              </h4>
              <p className="text-xs text-brand-text/75 leading-relaxed font-light">
                Realizamos plantões de vendas exclusivos todos os sábados, das 09h às 12h, com corretores a postos bem em frente ao empreendimento Village Parra 1.
              </p>
            </div>

            <div className="bg-brand-bg-primary/20 p-6 rounded-2xl space-y-2 border border-brand-bg-primary/30">
              <h4 className="font-bold text-brand-text flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-brand-accent-green shrink-0" />
                Quem responde pelas vendas?
              </h4>
              <p className="text-xs text-brand-text/75 leading-relaxed font-light">
                A Imobiliária Scatolin Imóveis possui exclusividade de vendas. Você pode entrar em contato diretamente pelo WhatsApp/Telefone (18) 99694-2082.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. CTA Banner final com imagem de fundo */}
      <section className="bg-brand-text text-white py-20 px-4 text-center space-y-6 relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-10 bg-no-repeat"
          style={{ backgroundImage: `url('/loteamentos/image copy.png')` }}
        />
        <div className="absolute inset-0 bg-brand-text/90" />
        
        <h2 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight relative z-10">
          Village Parra — O Espaço Perfeito para Você
        </h2>
        <p className="text-xs md:text-sm text-white/70 max-w-lg mx-auto font-light leading-relaxed relative z-10">
          Fale conosco hoje mesmo para garantir o seu terreno em uma das localizações que mais crescem e valorizam na Zona Sul de Ilha Solteira.
        </p>
        <div className="relative z-10">
          <a
            href="https://wa.me/5518996942082?text=Olá!%20Gostaria%20de%20agendar%20uma%20visita%20para%20conhecer%20o%20loteamento%20Village%20Parra."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-brand-primary hover:bg-brand-primary/95 text-white font-bold text-sm shadow-lg shadow-brand-primary/10 transition-all cursor-pointer"
          >
            Agendar Visita no Village Parra
          </a>
        </div>
      </section>
      
    </div>
  );
}
