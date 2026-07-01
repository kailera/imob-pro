import Link from "next/link";
import { Building, Phone, Mail, MapPin, MessageCircle } from "lucide-react";

export function PublicFooter() {
  return (
    <footer id="sobre" className="bg-brand-text text-white/95 border-t border-brand-primary/10 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12 pb-12 border-b border-white/10">
          
          {/* Logo & Description */}
          <div className="space-y-4 md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-brand-primary flex items-center justify-center text-white">
                <Building className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-brand-accent-gold">
                Scatolin <span className="font-light text-white">Imóveis</span>
              </span>
            </Link>
            <p className="text-sm text-white/70 leading-relaxed">
              Transformando o mercado imobiliário com integridade, sofisticação e excelência operacional. O seu novo capítulo começa aqui.
            </p>
            {/* Social Links */}
            <div className="flex items-center gap-3 pt-2">
              <a href="#" className="p-2 bg-white/5 hover:bg-brand-primary hover:text-white rounded-full transition-all text-white/80" aria-label="Instagram">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
              </a>
              <a href="#" className="p-2 bg-white/5 hover:bg-brand-primary hover:text-white rounded-full transition-all text-white/80" aria-label="Facebook">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                </svg>
              </a>
              <a href="https://wa.me/5518996942082" target="_blank" rel="noopener noreferrer" className="p-2 bg-white/5 hover:bg-brand-primary hover:text-white rounded-full transition-all text-white/80" aria-label="WhatsApp">
                <MessageCircle className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold tracking-wider uppercase text-brand-accent-gold">Navegação</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/#comprar" className="text-sm text-white/70 hover:text-brand-accent-gold transition-colors">
                  Imóveis para Comprar
                </Link>
              </li>
              <li>
                <Link href="/#alugar" className="text-sm text-white/70 hover:text-brand-accent-gold transition-colors">
                  Imóveis para Alugar
                </Link>
              </li>
              <li>
                <Link href="/#sobre" className="text-sm text-white/70 hover:text-brand-accent-gold transition-colors">
                  Sobre a Imobiliária
                </Link>
              </li>
              <li>
                <Link href="/loteamentos" className="text-sm text-white/70 hover:text-brand-accent-gold transition-colors">
                  Loteamentos (Lançamentos)
                </Link>
              </li>
              <li>
                <Link href="/admin" className="text-sm text-white/70 hover:text-brand-accent-gold transition-colors">
                  Área do Cliente (Painel)
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold tracking-wider uppercase text-brand-accent-gold">Fale Conosco</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-brand-accent-green shrink-0 mt-0.5" />
                <span className="text-sm text-white/70">(18) 9 9694-2082</span>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-brand-accent-green shrink-0 mt-0.5" />
                <span className="text-sm text-white/70">scatolinimoveis@gmail.com</span>
              </li>
            </ul>
          </div>

          {/* Location */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold tracking-wider uppercase text-brand-accent-gold">Onde Estamos</h3>
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-brand-accent-green shrink-0 mt-0.5" />
              <div className="text-sm text-white/70 space-y-1">
                <p>Passeio Cristalina, 113</p>
                <p>Centro — Ilha Solteira/SP</p>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Bottom */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/50">
          <p>© {new Date().getFullYear()} Scatolin Imóveis Ltda. Todos os direitos reservados.</p>
          <div className="flex items-center gap-4">
            <span>CRECI: 45.678-J</span>
            <span className="h-3 w-px bg-white/20"></span>
            <a href="#" className="hover:text-brand-accent-gold transition-colors">Termos de Uso</a>
            <span className="h-3 w-px bg-white/20"></span>
            <a href="#" className="hover:text-brand-accent-gold transition-colors">Política de Privacidade</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
