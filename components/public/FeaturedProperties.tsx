"use client";

import { useState } from "react";
import { PropertyCard, Property } from "./PropertyCard";



interface FeaturedPropertiesProps {
  properties: Property[];
}

export function FeaturedProperties({ properties = [] }: FeaturedPropertiesProps) {
  const [filter, setFilter] = useState<"todos" | "venda" | "locacao">("todos");

  // Usar imóveis reais do banco; se não houver nenhum publicado, usar demonstração
  const displayProperties = properties

  const filteredProperties = displayProperties.filter(
    (p) => filter === "todos" || p.operation === filter
  );

  return (
    <section id="imoveis" className="py-16 px-4 bg-brand-bg-primary/30">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <span className="text-sm font-bold uppercase tracking-wider text-brand-primary">
              Nossas Joias
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-brand-text">
              Imóveis em Destaque
            </h2>
            <p className="text-brand-text/70 text-sm md:text-base max-w-lg">
              Conheça nossas opções exclusivas selecionadas a dedo para garantir o máximo de conforto, segurança e estilo.
            </p>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 p-1 bg-white border border-zinc-200 shadow-sm rounded-xl shrink-0">
            <button
              onClick={() => setFilter("todos")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${filter === "todos"
                ? "bg-brand-primary text-white shadow-sm"
                : "text-brand-text/80 hover:bg-brand-bg-primary/50"
                }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilter("venda")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${filter === "venda"
                ? "bg-brand-primary text-white shadow-sm"
                : "text-brand-text/80 hover:bg-brand-bg-primary/50"
                }`}
            >
              Venda
            </button>
            <button
              onClick={() => setFilter("locacao")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${filter === "locacao"
                ? "bg-brand-primary text-white shadow-sm"
                : "text-brand-text/80 hover:bg-brand-bg-primary/50"
                }`}
            >
              Locação
            </button>
          </div>
        </div>

        {/* Grid layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {filteredProperties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>

      </div>
    </section>
  );
}
