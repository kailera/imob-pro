"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, Building, DollarSign } from "lucide-react";

export function SiteHero() {
  const router = useRouter();
  const [operation, setOperation] = useState<"venda" | "locacao">("venda");
  const [searchQuery, setSearchQuery] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [priceRange, setPriceRange] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Redirect to public busca page
    const params = new URLSearchParams();
    params.set("operation", operation);
    if (searchQuery.trim()) {
      // MapSearchContainer filters internally, let's pass search parameter
      params.set("search", searchQuery.trim());
    }
    router.push(`/busca?${params.toString()}`);
  };

  return (
    <section className="relative min-h-[70vh] flex flex-col items-center justify-center bg-brand-bg-secondary pt-12 pb-24 md:pb-36 px-4 overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1920&q=80"
          alt="Modern luxury house"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-[#280003]/60 backdrop-blur-[1px]"></div>
      </div>

      {/* Hero Content */}
      <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6 md:space-y-8 select-none">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
          Encontre o lar perfeito <br className="hidden md:inline" />
          para a sua nova história
        </h1>
        <p className="text-lg md:text-xl text-brand-bg-primary/95 max-w-2xl mx-auto font-light leading-relaxed">
          As melhores opções de compra e locação de alto padrão, aliando a segurança que você busca e a sofisticação que você merece.
        </p>

        {/* Floating Minimalist Search Engine */}
        <div className="w-full max-w-4xl bg-white/95 backdrop-blur shadow-2xl rounded-2xl p-5 md:p-6 text-brand-text text-left border border-white/20">
          
          {/* Tabs */}
          <div className="flex gap-2 border-b border-brand-bg-primary/50 pb-4 mb-5">
            <button
              onClick={() => setOperation("venda")}
              className={`px-6 py-2 rounded-lg font-bold text-sm transition-all duration-200 ${
                operation === "venda"
                  ? "bg-brand-primary text-white shadow-md shadow-brand-primary/10"
                  : "text-brand-text/75 hover:bg-brand-bg-primary/70"
              }`}
            >
              Comprar
            </button>
            <button
              onClick={() => setOperation("locacao")}
              className={`px-6 py-2 rounded-lg font-bold text-sm transition-all duration-200 ${
                operation === "locacao"
                  ? "bg-brand-primary text-white shadow-md shadow-brand-primary/10"
                  : "text-brand-text/75 hover:bg-brand-bg-primary/70"
              }`}
            >
              Alugar
            </button>
          </div>

          {/* Search Inputs Form */}
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            
            {/* Search Address/City */}
            <div className="md:col-span-5 space-y-1">
              <label className="text-xs font-semibold text-brand-text/60 uppercase tracking-wider block">Onde?</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-primary/60" />
                <input
                  type="text"
                  placeholder="Digite bairro ou cidade"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-brand-bg-primary/50 border border-brand-bg-primary rounded-xl text-brand-text placeholder-brand-text/40 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                />
              </div>
            </div>

            {/* Property Type Dropdown */}
            <div className="md:col-span-3 space-y-1">
              <label className="text-xs font-semibold text-brand-text/60 uppercase tracking-wider block">Tipo de Imóvel</label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-primary/60" />
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  className="w-full pl-10 pr-8 py-3 bg-brand-bg-primary/50 border border-brand-bg-primary rounded-xl text-brand-text font-medium text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all appearance-none cursor-pointer"
                >
                  <option value="">Todos</option>
                  <option value="casa">Casa</option>
                  <option value="apartamento">Apartamento</option>
                  <option value="cobertura">Cobertura</option>
                  <option value="comercial">Comercial</option>
                </select>
              </div>
            </div>

            {/* Budget Range Dropdown */}
            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-semibold text-brand-text/60 uppercase tracking-wider block">Valor Máx.</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-primary/60" />
                <select
                  value={priceRange}
                  onChange={(e) => setPriceRange(e.target.value)}
                  className="w-full pl-10 pr-8 py-3 bg-brand-bg-primary/50 border border-brand-bg-primary rounded-xl text-brand-text font-medium text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all appearance-none cursor-pointer"
                >
                  <option value="">Qualquer</option>
                  {operation === "venda" ? (
                    <>
                      <option value="500000">Até R$ 500k</option>
                      <option value="1000000">R$ 500k - R$ 1M</option>
                      <option value="2000000">R$ 1M - R$ 2M</option>
                      <option value="2000001">Acima de R$ 2M</option>
                    </>
                  ) : (
                    <>
                      <option value="3000">Até R$ 3.000</option>
                      <option value="6000">R$ 3.000 - R$ 6.000</option>
                      <option value="12000">R$ 6.000 - R$ 12.000</option>
                      <option value="12001">Acima de R$ 12.000</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {/* Submit Button */}
            <div className="md:col-span-2 h-full flex items-end">
              <button
                type="submit"
                className="w-full py-3 bg-brand-primary text-white rounded-xl font-bold text-sm shadow-md hover:bg-brand-primary/95 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer h-[46px]"
              >
                <Search className="w-4 h-4" />
                Buscar
              </button>
            </div>

          </form>
        </div>

      </div>
    </section>
  );
}
