import { Bed, Bath, Car, Maximize2, MapPin } from "lucide-react";

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
  neighborhood: string;
  city: string;
}

interface PropertyCardProps {
  property: Property;
}

export function PropertyCard({ property }: PropertyCardProps) {
  const formattedPrice = property.operation === "locacao"
    ? `R$ ${property.price.toLocaleString("pt-BR")}/mês`
    : `R$ ${property.price.toLocaleString("pt-BR")}`;

  return (
    <article className="bg-white border border-zinc-200/80 rounded-2xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group overflow-hidden">
      
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

          {/* Price - THE GREATEST HIGHLIGHT IN BOLD */}
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
  );
}
