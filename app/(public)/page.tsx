import { SiteHero } from "@/components/SiteHero";
import { FeaturedProperties } from "@/components/FeaturedProperties";
import { ShieldCheck, Sparkles, Zap, Star, ArrowUpRight } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Scatolin Imóveis | Encontre seu Lar Perfeito",
  description: "Vitrine digital de imóveis exclusivos para venda e locação com a maior segurança jurídica e transparência.",
};

export default function PublicHome() {
  const valueProps = [
    {
      title: "Segurança Jurídica",
      description: "Contratos validados por advogados especialistas e vistorias rigorosas registradas detalhadamente em nosso sistema.",
      icon: ShieldCheck,
    },
    {
      title: "Consultoria Exclusiva",
      description: "Nossos corretores realizam curadorias direcionadas para apresentar apenas imóveis que combinam com seu estilo de vida.",
      icon: Sparkles,
    },
    {
      title: "Processo 100% Digital",
      description: "Assine contratos, envie documentações e acompanhe propostas de maneira ágil, transparente e sem burocracia.",
      icon: Zap,
    },
  ];

  const testimonials = [
    {
      name: "Mariana S. Albuquerque",
      role: "Compradora em Moema",
      text: "A experiência de compra com a Scatolin foi impecável. A vistoria minuciosa me deu total segurança para fechar o negócio sem surpresas.",
      rating: 5,
    },
    {
      name: "Ricardo Fonseca",
      role: "Proprietário no Itaim Bibi",
      text: "Como locador, prezo pela segurança dos meus bens. O laudo de vistoria gerado pela equipe deles é o mais detalhado e profissional que já vi.",
      rating: 5,
    },
  ];

  return (
    <div className="space-y-0">
      {/* Hero Banner with Search Engine */}
      <SiteHero />

      {/* Featured Properties grid */}
      <FeaturedProperties />

      {/* Pillars / Value Propositions */}
      <section id="sobre" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <span className="text-sm font-bold uppercase tracking-wider text-brand-primary">
              Nossa Essência
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-brand-text">
              Por que a Scatolin Imóveis?
            </h2>
            <p className="text-brand-text/70 text-sm md:text-base leading-relaxed">
              Aliamos a tradição de um serviço exclusivo com a modernidade de processos eficientes para garantir a melhor transação imobiliária.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {valueProps.map((prop, idx) => (
              <div
                key={idx}
                className="p-8 rounded-2xl bg-brand-bg-primary/30 border border-brand-bg-primary/20 hover:border-brand-primary/20 hover:bg-white hover:shadow-xl transition-all duration-300 group space-y-4"
              >
                <div className="w-12 h-12 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary group-hover:bg-brand-primary group-hover:text-white transition-all duration-300">
                  <prop.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-brand-text">{prop.title}</h3>
                <p className="text-brand-text/70 text-sm leading-relaxed">{prop.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof / Testimonials */}
      <section className="py-20 bg-brand-bg-primary/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <span className="text-sm font-bold uppercase tracking-wider text-brand-primary">
              Depoimentos
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-brand-text">
              O que dizem nossos clientes
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {testimonials.map((t, idx) => (
              <div key={idx} className="bg-white p-8 rounded-2xl border border-zinc-200/80 shadow-sm space-y-4">
                <div className="flex gap-1 text-brand-accent-gold">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <p className="text-brand-text/80 text-sm leading-relaxed italic">
                  "{t.text}"
                </p>
                <div>
                  <h4 className="font-bold text-brand-text text-sm">{t.name}</h4>
                  <p className="text-xs text-brand-text/50">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA / Announce Property Banner */}
      <section className="bg-brand-text text-white py-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#004777_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <div className="max-w-4xl mx-auto text-center space-y-8 relative z-10">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">
            Quer vender ou alugar o seu imóvel?
          </h2>
          <p className="text-base md:text-lg text-white/70 max-w-2xl mx-auto font-light leading-relaxed">
            Anuncie na imobiliária que investe em marketing inteligente, vistorias de alto nível e assessoria jurídica completa para fechar contratos rapidamente.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://wa.me/5518996942082"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-brand-primary text-white font-bold text-sm hover:bg-brand-primary/95 transition-all shadow-lg shadow-brand-primary/10 flex items-center justify-center gap-2 group cursor-pointer"
            >
              Falar com Consultor
              <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
            <Link
              href="/admin"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-white/10 text-white font-bold text-sm border border-white/20 hover:bg-white/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              Entrar no Painel
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
