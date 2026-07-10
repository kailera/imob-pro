"use client";

import { useState } from "react";
import { PropertyCard, Property } from "./PropertyCard";

const MOCK_PROPERTIES: Property[] = [
  {
    id: "1",
    title: "Casa de Alto Padrão em Alphaville",
    type: "Casa",
    price: 2500000,
    operation: "venda",
    beds: 4,
    baths: 5,
    parking: 4,
    area: 420,
    image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80",
    neighborhood: "Alphaville",
    city: "Barueri/SP",
  },
  {
    id: "2",
    title: "Apartamento Elegante nos Jardins",
    type: "Apartamento",
    price: 1800000,
    operation: "venda",
    beds: 3,
    baths: 3,
    parking: 2,
    area: 160,
    image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80",
    neighborhood: "Jardins",
    city: "São Paulo/SP",
  },
  {
    id: "3",
    title: "Cobertura Exclusiva no Itaim Bibi",
    type: "Cobertura",
    price: 12000,
    operation: "locacao",
    beds: 3,
    baths: 4,
    parking: 3,
    area: 280,
    image: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80",
    neighborhood: "Itaim Bibi",
    city: "São Paulo/SP",
  },
  {
    id: "4",
    title: "Casa Contemporânea no Morumbi",
    type: "Casa",
    price: 3200000,
    operation: "venda",
    beds: 5,
    baths: 6,
    parking: 4,
    area: 550,
    image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
    neighborhood: "Morumbi",
    city: "São Paulo/SP",
  },
  {
    id: "5",
    title: "Flat Moderno e Mobiliado",
    type: "Apartamento",
    price: 4500,
    operation: "locacao",
    beds: 1,
    baths: 1,
    parking: 1,
    area: 45,
    image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
    neighborhood: "Pinheiros",
    city: "São Paulo/SP",
  },
  {
    id: "6",
    title: "Sobrado Moderno com Piscina",
    type: "Casa",
    price: 2100000,
    operation: "venda",
    beds: 3,
    baths: 4,
    parking: 2,
    area: 230,
    image: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=800&q=80",
    neighborhood: "Moema",
    city: "São Paulo/SP",
  },
];

interface FeaturedPropertiesProps {
  properties: Property[];
}

export function FeaturedProperties({ properties = [] }: FeaturedPropertiesProps) {
  const [filter, setFilter] = useState<"todos" | "venda" | "locacao">("todos");

  const filteredProperties = properties.filter(
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
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                filter === "todos"
                  ? "bg-brand-primary text-white shadow-sm"
                  : "text-brand-text/80 hover:bg-brand-bg-primary/50"
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilter("venda")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                filter === "venda"
                  ? "bg-brand-primary text-white shadow-sm"
                  : "text-brand-text/80 hover:bg-brand-bg-primary/50"
              }`}
            >
              Venda
            </button>
            <button
              onClick={() => setFilter("locacao")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                filter === "locacao"
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
