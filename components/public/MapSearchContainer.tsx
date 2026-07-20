"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { PropertyCard, Property } from "./PropertyCard";
import { Search, Map, List, SlidersHorizontal, ChevronDown, Check } from "lucide-react";

// Carrega o componente de mapa dinamicamente para evitar problemas de SSR com o Leaflet
const MapComponent = dynamic(() => import("./MapComponent"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-zinc-100 text-zinc-500 font-semibold text-sm">
      Carregando mapa interativo...
    </div>
  ),
});

interface MapSearchContainerProps {
  initialProperties: Property[];
}

function SearchParamsLoader({ 
  setOperation,
  setSearchQuery
}: { 
  setOperation: React.Dispatch<React.SetStateAction<"todos" | "venda" | "locacao">>;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
}) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const op = searchParams.get("operation");
    if (op === "venda" || op === "locacao") {
      setOperation(op);
    }
    const q = searchParams.get("search");
    if (q) {
      setSearchQuery(q);
    }
  }, [searchParams, setOperation, setSearchQuery]);
  return null;
}

export function MapSearchContainer({ initialProperties }: MapSearchContainerProps) {
  const router = useRouter();
  
  // Estados de Filtros
  const [operation, setOperation] = useState<"todos" | "venda" | "locacao">("todos");
  const [type, setType] = useState<string>("todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [maxPrice, setMaxPrice] = useState<number | "">("");
  const [beds, setBeds] = useState<number | "">("");

  // Estado de bounds do mapa e controle de busca geográfico (QuintoAndar)
  const [mapBounds, setMapBounds] = useState<any>(null);
  const [searchInMapArea, setSearchInMapArea] = useState<boolean>(true);

  // Estado Compartilhado de Hover
  const [hoveredPropertyId, setHoveredPropertyId] = useState<string | null>(null);
  
  // Controle de Visualização Mobile
  const [viewMode, setViewMode] = useState<"list" | "map">("list");

  // Filtragem dos Imóveis base (sem limites do mapa, para alimentar os pins no mapa)
  const filteredProperties = initialProperties.filter((p) => {
    // Filtro por operação
    if (operation !== "todos" && p.operation !== operation) return false;
    
    // Filtro por tipo
    if (type !== "todos" && p.type.toLowerCase() !== type.toLowerCase()) return false;
    
    // Filtro por busca de texto (bairro, cidade ou título)
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      const matchText = 
        p.title.toLowerCase().includes(query) ||
        p.neighborhood.toLowerCase().includes(query) ||
        p.city.toLowerCase().includes(query);
      if (!matchText) return false;
    }

    // Filtro por preço máximo
    if (maxPrice !== "" && p.price > maxPrice) return false;

    // Filtro por número de quartos
    if (beds !== "" && p.beds < beds) return false;

    return true;
  });

  // Filtragem adicional de imóveis para exibição na lista (limites do mapa)
  const listProperties = filteredProperties.filter((p) => {
    if (searchInMapArea && mapBounds) {
      if (p.latitude != null && p.longitude != null) {
        return mapBounds.contains([p.latitude, p.longitude]);
      }
      return false;
    }
    return true;
  });

  const handleMarkerClick = (p: any) => {
    // Rola até o card correspondente na lista
    const element = document.getElementById(`property-card-${p.id}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] w-full overflow-hidden">
      <Suspense fallback={null}>
        <SearchParamsLoader setOperation={setOperation} setSearchQuery={setSearchQuery} />
      </Suspense>

      {/* Top Bar: Busca e Filtros rápidos */}
      <header className="bg-white border-b border-zinc-200 px-4 py-3 flex flex-wrap items-center gap-3 z-20 shadow-sm shrink-0">
        {/* Campo de Busca Principal */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Qualquer lugar em São Paulo, SP ou bairro..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#004777]/20 focus:border-[#004777] bg-zinc-50 transition-all font-medium text-zinc-800"
          />
        </div>

        {/* Seletor Venda / Locação */}
        <div className="flex bg-zinc-100 p-0.5 rounded-xl border border-zinc-200">
          <button
            onClick={() => setOperation("todos")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              operation === "todos"
                ? "bg-white text-[#004777] shadow-sm"
                : "text-zinc-600 hover:text-zinc-950"
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setOperation("venda")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              operation === "venda"
                ? "bg-white text-brand-accent-gold shadow-sm"
                : "text-zinc-600 hover:text-zinc-950"
            }`}
          >
            Comprar
          </button>
          <button
            onClick={() => setOperation("locacao")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              operation === "locacao"
                ? "bg-white text-brand-accent-green shadow-sm"
                : "text-zinc-600 hover:text-zinc-950"
            }`}
          >
            Alugar
          </button>
        </div>

        {/* Tipo de Imóvel */}
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="px-3 py-2 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#004777]/20 focus:border-[#004777] cursor-pointer"
        >
          <option value="todos">Tipo de Imóvel</option>
          <option value="casa">Casa</option>
          <option value="apartamento">Apartamento</option>
          <option value="lote">Lote</option>
          <option value="comercial">Comercial</option>
          <option value="rural">Rural</option>
        </select>

        {/* Preço Máximo */}
        <div className="flex items-center gap-1.5 border border-zinc-200 px-3 py-1 rounded-xl bg-white">
          <span className="text-[10px] font-bold text-zinc-400 uppercase">Preço Máx R$</span>
          <input
            type="number"
            placeholder="Ilimitado"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value === "" ? "" : Number(e.target.value))}
            className="w-20 py-1 text-xs font-bold text-[#004777] focus:outline-none"
          />
        </div>

        {/* Quartos */}
        <select
          value={beds}
          onChange={(e) => setBeds(e.target.value === "" ? "" : Number(e.target.value))}
          className="px-3 py-2 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#004777]/20 focus:border-[#004777] cursor-pointer"
        >
          <option value="">Quartos</option>
          <option value={1}>1+ Quarto</option>
          <option value={2}>2+ Quartos</option>
          <option value={3}>3+ Quartos</option>
          <option value={4}>4+ Quartos</option>
        </select>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Coluna Esquerda: Listagem de Imóveis (Ocupa full em mobile se viewMode === 'list') */}
        <section 
          className={`w-full md:w-1/2 h-full overflow-y-auto px-4 md:px-6 py-6 space-y-6 scroll-smooth bg-zinc-50 border-r border-zinc-200 transition-all duration-300 ${
            viewMode === "list" ? "block" : "hidden md:block"
          }`}
        >
          {/* Header de Resultados */}
          <div className="flex justify-between items-center border-b border-zinc-200 pb-3">
            <h2 className="text-zinc-900 font-extrabold text-lg tracking-tight">
              {listProperties.length} {listProperties.length === 1 ? "imóvel encontrado" : "imóveis encontrados"}
            </h2>
          </div>

          {listProperties.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-400 space-y-3">
              <SlidersHorizontal className="w-10 h-10 text-zinc-300" />
              <p className="text-sm font-semibold">Nenhum imóvel corresponde aos filtros selecionados nesta área.</p>
              <button 
                onClick={() => {
                  setOperation("todos");
                  setType("todos");
                  setSearchQuery("");
                  setMaxPrice("");
                  setBeds("");
                  setSearchInMapArea(false);
                }}
                className="text-xs text-[#004777] font-bold hover:underline"
              >
                Limpar todos os filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
              {listProperties.map((p) => (
                <div
                  key={p.id}
                  id={`property-card-${p.id}`}
                  onMouseEnter={() => setHoveredPropertyId(p.id)}
                  onMouseLeave={() => setHoveredPropertyId(null)}
                  className={`transition-all duration-300 rounded-2xl ${
                    hoveredPropertyId === p.id 
                      ? "ring-2 ring-[#004777] shadow-lg scale-[1.01]" 
                      : ""
                  }`}
                >
                  <PropertyCard property={p} />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Coluna Direita: Mapa Interativo (Ocupa full em mobile se viewMode === 'map') */}
        <section 
          className={`w-full md:w-1/2 h-full transition-all duration-300 relative ${
            viewMode === "map" ? "block" : "hidden md:block"
          }`}
        >
          {/* Caixa de Seleção Flutuante - Estilo QuintoAndar */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-white/95 backdrop-blur-sm px-4 py-2.5 rounded-full shadow-lg border border-zinc-200/80 flex items-center gap-2 transition-all hover:bg-white hover:scale-102">
            <input
              type="checkbox"
              id="search-map-area"
              checked={searchInMapArea}
              onChange={(e) => setSearchInMapArea(e.target.checked)}
              className="w-4 h-4 text-[#004777] border-zinc-300 rounded focus:ring-[#004777] cursor-pointer"
            />
            <label 
              htmlFor="search-map-area" 
              className="text-[11px] font-extrabold text-zinc-700 cursor-pointer select-none whitespace-nowrap"
            >
              Buscar conforme movo o mapa
            </label>
          </div>

          <MapComponent
            properties={filteredProperties}
            hoveredPropertyId={hoveredPropertyId}
            onHoverProperty={setHoveredPropertyId}
            onClickProperty={handleMarkerClick}
            onBoundsChange={setMapBounds}
          />
        </section>

        {/* Floating Mobile Toggle Button */}
        <button
          onClick={() => setViewMode(viewMode === "list" ? "map" : "list")}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-zinc-900 text-white font-bold text-xs px-5 py-3 rounded-full shadow-2xl flex items-center gap-2 hover:scale-105 active:scale-95 transition-all md:hidden border border-white/20"
        >
          {viewMode === "list" ? (
            <>
              <Map className="w-4 h-4" />
              <span>Ver Mapa</span>
            </>
          ) : (
            <>
              <List className="w-4 h-4" />
              <span>Ver Lista</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
