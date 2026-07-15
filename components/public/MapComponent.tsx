"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Corrigindo o problema do ícone padrão do Leaflet no Next.js
const DefaultIcon = L.icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Função para criar o ícone customizado com o preço do imóvel
const createPriceIcon = (price: number, isHovered: boolean, operation: "venda" | "locacao") => {
  const formatted = price >= 1000000 
    ? `${(price / 1000000).toFixed(1)}M` 
    : `${(price / 1000).toFixed(0)}k`;
  
  const badgeColor = isHovered 
    ? "bg-[#004777] text-white border-white scale-110 z-50 shadow-xl" 
    : operation === "locacao"
      ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
      : "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100";

  return L.divIcon({
    className: "custom-price-pin",
    html: `<div class="px-2 py-1 rounded-lg font-extrabold text-[10px] shadow-md border transition-all duration-300 flex items-center justify-center whitespace-nowrap ${badgeColor}">R$ ${formatted}</div>`,
    iconSize: [55, 25],
    iconAnchor: [27, 12],
  });
};

interface MapProperty {
  id: string;
  title: string;
  price: number;
  operation: "venda" | "locacao";
  latitude?: number | null;
  longitude?: number | null;
  neighborhood: string;
  image: string;
}

interface MapComponentProps {
  properties: MapProperty[];
  hoveredPropertyId: string | null;
  onHoverProperty: (id: string | null) => void;
  onClickProperty: (property: MapProperty) => void;
}

// Subcomponente para reposicionar o mapa de acordo com novos pins
function FitMapBounds({ properties }: { properties: MapProperty[] }) {
  const map = useMap();

  useEffect(() => {
    const validCoords = properties
      .filter((p) => p.latitude != null && p.longitude != null)
      .map((p) => [p.latitude as number, p.longitude as number] as [number, number]);

    if (validCoords.length > 0) {
      const bounds = L.latLngBounds(validCoords);
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [properties, map]);

  return null;
}

export default function MapComponent({
  properties,
  hoveredPropertyId,
  onHoverProperty,
  onClickProperty,
}: MapComponentProps) {
  // Ilha Solteira como centro padrão se não houver coordenadas
  const defaultCenter: [number, number] = [-20.4312, -51.3414];
  const defaultZoom = 14;

  const validProperties = properties.filter(
    (p) => p.latitude != null && p.longitude != null
  );

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        className="w-full h-full min-h-[300px] md:min-h-0"
        zoomControl={true}
        style={{ zIndex: 1 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {validProperties.map((p) => {
          const isHovered = hoveredPropertyId === p.id;
          return (
            <Marker
              key={p.id}
              position={[p.latitude as number, p.longitude as number]}
              icon={createPriceIcon(p.price, isHovered, p.operation)}
              eventHandlers={{
                mouseover: () => onHoverProperty(p.id),
                mouseout: () => onHoverProperty(null),
                click: () => onClickProperty(p),
              }}
            >
              <Popup>
                <div className="flex flex-col gap-1.5 p-1 w-44">
                  <img
                    src={p.image}
                    alt={p.title}
                    className="w-full h-24 object-cover rounded-lg"
                  />
                  <h4 className="font-bold text-xs text-zinc-900 leading-tight line-clamp-2">
                    {p.title}
                  </h4>
                  <div className="font-extrabold text-[#004777] text-xs">
                    R$ {p.price.toLocaleString("pt-BR")}
                    {p.operation === "locacao" && "/mês"}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        <FitMapBounds properties={validProperties} />
      </MapContainer>
    </div>
  );
}
