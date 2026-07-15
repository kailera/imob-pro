"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Bed, Bath, Car, Maximize2, MapPin, X, ChevronLeft, ChevronRight, Loader2, Send } from "lucide-react";
import { createContrapropostaLeadAction } from "@/app/actions/leadActions";

export interface Property {
  id: string;
  title: string;
  type: string;
  price: number;
  operation: "venda" | "locacao";
  beds: number;
  baths: number;
  parking: number;
  area: number;
  image: string;
  images?: string[];
  description?: string | null;
  neighborhood: string;
  city: string;
  latitude?: number | null;
  longitude?: number | null;
}

interface PropertyCardProps {
  property: Property;
}

export function PropertyCard({ property }: PropertyCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);
  
  // Form states
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [valor, setValor] = useState("");
  const [descricaoBusca, setDescricaoBusca] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const rawNumbers = input.replace(/\D/g, "");
    
    let formatted = "";
    if (rawNumbers.length > 0) {
      formatted = `(${rawNumbers.slice(0, 2)}`;
      if (rawNumbers.length > 2) {
        formatted += `) ${rawNumbers.slice(2, 7)}`;
      }
      if (rawNumbers.length > 7) {
        formatted += `-${rawNumbers.slice(7, 11)}`;
      }
    }
    setTelefone(formatted);
  };

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const rawNumbers = input.replace(/\D/g, "");
    if (!rawNumbers) {
      setValor("");
      return;
    }
    const floatValue = parseFloat(rawNumbers) / 100;
    const formatted = floatValue.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
    setValor(formatted);
  };

  const formattedPrice = property.operation === "locacao"
    ? `R$ ${property.price.toLocaleString("pt-BR")}/mês`
    : `R$ ${property.price.toLocaleString("pt-BR")}`;

  const allImages = property.images && property.images.length > 0
    ? property.images
    : [property.image];

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
  };

  const handleSubmitProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(false);

    if (!telefone.trim() || telefone.replace(/\D/g, "").length < 10) {
      setSubmitError("O telefone de contato é obrigatório e deve ser válido.");
      return;
    }
    if (!valor.trim()) {
      setSubmitError("O valor da contraproposta é obrigatório.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createContrapropostaLeadAction({
        nome: nome.trim() || null,
        email: email.trim() ? email.toLowerCase().trim() : null,
        telefone: telefone.trim(),
        valor: valor.trim(),
        imovelCodigo: property.id,
        imovelTitulo: property.title,
        imovelOperacao: property.operation,
        descricaoBusca: descricaoBusca.trim() || null,
      });

      if (res.success) {
        setSubmitSuccess(true);
        setNome("");
        setEmail("");
        setTelefone("");
        setValor("");
        setDescricaoBusca("");
      } else {
        setSubmitError(res.error || "Ocorreu um erro ao enviar a contraproposta.");
      }
    } catch (err) {
      console.error(err);
      setSubmitError("Erro de conexão ao enviar a contraproposta.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <article 
        onClick={() => setIsModalOpen(true)}
        className="bg-white border border-zinc-200/80 rounded-2xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group overflow-hidden cursor-pointer"
      >
        {/* Property Image Container */}
        <div className="relative overflow-hidden aspect-[4/3] w-full bg-zinc-100">
          <img
            src={property.image}
            alt={property.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          
          {/* Operation Badge */}
          <div className="absolute top-4 left-4 z-10">
            <span className={`inline-block font-bold text-xs uppercase px-3 py-1.5 rounded-lg shadow-md ${
              property.operation === "venda"
                ? "bg-brand-accent-gold text-brand-text"
                : "bg-brand-accent-green text-white"
            }`}>
              {property.operation === "venda" ? "Venda" : "Locação"}
            </span>
          </div>

          {/* Type Badge */}
          <div className="absolute bottom-4 left-4 z-10">
            <span className="inline-block bg-brand-text/75 text-white/95 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md backdrop-blur-[2px]">
              {property.type}
            </span>
          </div>
        </div>

        {/* Property Details Container */}
        <div className="p-5 flex-1 flex flex-col justify-between">
          <div>
            {/* Location */}
            <div className="flex items-center gap-1 text-xs font-semibold text-brand-text/60 mb-2">
              <MapPin className="w-3.5 h-3.5 text-brand-primary" />
              <span>{property.neighborhood}, {property.city}</span>
            </div>

            {/* Title */}
            <h3 className="text-lg font-bold text-brand-text leading-snug mb-3 group-hover:text-brand-primary transition-colors line-clamp-1">
              {property.title}
            </h3>

            {/* Price */}
            <div className="text-2xl font-extrabold text-brand-primary tracking-tight mb-4">
              {formattedPrice}
            </div>
          </div>

          {/* Property Features/Specs */}
          <div className="grid grid-cols-4 gap-2 pt-4 border-t border-brand-bg-primary text-xs font-medium text-brand-text/80">
            
            <div className="flex flex-col items-center justify-center p-1.5 bg-brand-bg-primary/40 rounded-lg hover:bg-brand-bg-primary transition-colors text-center" title="Quartos">
              <Bed className="w-4 h-4 text-brand-primary mb-1" />
              <span className="font-bold text-brand-text text-[11px]">{property.beds} {property.beds === 1 ? "Quarto" : "Quartos"}</span>
            </div>

            <div className="flex flex-col items-center justify-center p-1.5 bg-brand-bg-primary/40 rounded-lg hover:bg-brand-bg-primary transition-colors text-center" title="Banheiros">
              <Bath className="w-4 h-4 text-brand-primary mb-1" />
              <span className="font-bold text-brand-text text-[11px]">{property.baths} {property.baths === 1 ? "Banho" : "Banhos"}</span>
            </div>

            <div className="flex flex-col items-center justify-center p-1.5 bg-brand-bg-primary/40 rounded-lg hover:bg-brand-bg-primary transition-colors text-center" title="Vagas">
              <Car className="w-4 h-4 text-brand-primary mb-1" />
              <span className="font-bold text-brand-text text-[11px]">{property.parking} {property.parking === 1 ? "Vaga" : "Vagas"}</span>
            </div>

            <div className="flex flex-col items-center justify-center p-1.5 bg-brand-bg-primary/40 rounded-lg hover:bg-brand-bg-primary transition-colors text-center" title="Área Útil">
              <Maximize2 className="w-4 h-4 text-brand-primary mb-1" />
              <span className="font-bold text-brand-text text-[11px]">{property.area} m²</span>
            </div>

          </div>
        </div>
      </article>

      {/* Property Details & Proposal Modal */}
      {isModalOpen && mounted && createPortal(
        <div 
          className="fixed inset-0 flex items-center justify-center bg-black/60 p-4 md:p-6 animate-in fade-in duration-200"
          style={{ zIndex: 99999 }}
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto border border-zinc-150 flex flex-col md:flex-row relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 z-20 bg-white/80 hover:bg-white text-zinc-800 p-2 rounded-full shadow-md transition-colors border border-zinc-200"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Left Column: Image Gallery/Carousel */}
            <div className="w-full md:w-1/2 bg-zinc-950 relative min-h-[300px] md:min-h-[500px] flex items-center justify-center group/carousel">
              <img
                src={allImages[currentImageIndex]}
                alt={`${property.title} - Foto ${currentImageIndex + 1}`}
                className="max-h-[500px] w-full object-contain"
              />

              {allImages.length > 1 && (
                <>
                  <button
                    onClick={handlePrevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/75 text-white p-2 rounded-full transition-colors flex items-center justify-center"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleNextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/75 text-white p-2 rounded-full transition-colors flex items-center justify-center"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-xs font-semibold">
                    {currentImageIndex + 1} / {allImages.length}
                  </div>
                </>
              )}
            </div>

            {/* Right Column: Property details + Proposal form */}
            <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col justify-between overflow-y-auto max-h-[90vh] md:max-h-[500px]">
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-text/60 mb-2">
                    <MapPin className="w-4 h-4 text-brand-primary" />
                    <span>{property.neighborhood}, {property.city}</span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold text-zinc-900 leading-tight">
                    {property.title}
                  </h2>
                  <div className="text-2xl font-extrabold text-brand-primary mt-2">
                    {formattedPrice}
                  </div>
                </div>

                {/* Features Row */}
                <div className="grid grid-cols-4 gap-2 py-4 border-y border-zinc-100 text-xs font-semibold text-zinc-700">
                  <div className="flex flex-col items-center p-2 bg-zinc-50 rounded-xl text-center">
                    <Bed className="w-5 h-5 text-brand-primary mb-1" />
                    <span>{property.beds} {property.beds === 1 ? "Quarto" : "Quartos"}</span>
                  </div>
                  <div className="flex flex-col items-center p-2 bg-zinc-50 rounded-xl text-center">
                    <Bath className="w-5 h-5 text-brand-primary mb-1" />
                    <span>{property.baths} {property.baths === 1 ? "Banho" : "Banhos"}</span>
                  </div>
                  <div className="flex flex-col items-center p-2 bg-zinc-50 rounded-xl text-center">
                    <Car className="w-5 h-5 text-brand-primary mb-1" />
                    <span>{property.parking} {property.parking === 1 ? "Vaga" : "Vagas"}</span>
                  </div>
                  <div className="flex flex-col items-center p-2 bg-zinc-50 rounded-xl text-center">
                    <Maximize2 className="w-5 h-5 text-brand-primary mb-1" />
                    <span>{property.area} m²</span>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h4 className="font-bold text-zinc-900 mb-1.5 text-sm uppercase tracking-wider">Descrição</h4>
                  <p className="text-zinc-600 text-sm leading-relaxed whitespace-pre-line">
                    {property.description || "Nenhuma descrição adicional fornecida para este imóvel."}
                  </p>
                </div>

                {/* Proposal Form Section */}
                <div className="pt-6 border-t border-zinc-100 space-y-4">
                  <h4 className="font-bold text-zinc-900 text-sm uppercase tracking-wider">Enviar Contraproposta</h4>
                  
                  {submitSuccess ? (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 text-xs font-semibold leading-relaxed animate-in fade-in duration-200">
                      Sua contraproposta foi enviada com sucesso! Um corretor entrará em contato em breve para dar andamento.
                    </div>
                  ) : (
                    <form onSubmit={handleSubmitProposal} className="space-y-3">
                      {submitError && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3 text-xs font-semibold">
                          {submitError}
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Nome Completo</label>
                          <input
                            type="text"
                            placeholder="Ex: João Silva"
                            value={nome}
                            onChange={(e) => setNome(e.target.value)}
                            className="w-full bg-zinc-50 border border-zinc-200 px-3 py-2 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-brand-primary transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">E-mail</label>
                          <input
                            type="email"
                            placeholder="Ex: joao@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-zinc-50 border border-zinc-200 px-3 py-2 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-brand-primary transition-all"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Telefone (Obrigatório)</label>
                          <input
                            type="tel"
                            required
                            placeholder="Ex: (18) 99999-9999"
                            value={telefone}
                            onChange={handleTelefoneChange}
                            className="w-full bg-zinc-50 border border-zinc-200 px-3 py-2 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-brand-primary transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Sua Proposta R$ (Obrigatório)</label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: R$ 0,00"
                            value={valor}
                            onChange={handleValorChange}
                            className="w-full bg-zinc-50 border border-zinc-200 px-3 py-2 rounded-lg text-xs font-bold text-brand-primary focus:bg-white focus:outline-none focus:border-brand-primary transition-all"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Descreva o imóvel que você precisa (opcional)</label>
                        <textarea
                          placeholder="Ex: Procuro casa de 3 quartos, com churrasqueira no bairro Jardim Paulista..."
                          value={descricaoBusca}
                          onChange={(e) => setDescricaoBusca(e.target.value)}
                          rows={2}
                          className="w-full bg-zinc-50 border border-zinc-200 px-3 py-2 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-brand-primary transition-all resize-none"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full mt-2 px-4 py-2.5 bg-brand-primary hover:bg-brand-primary/95 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Enviando...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Enviar Proposta</span>
                          </>
                        )}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
