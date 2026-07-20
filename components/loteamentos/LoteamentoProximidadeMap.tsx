"use client";

import { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Compass, Navigation } from "lucide-react";

// Coordenadas centrais reais do Loteamento Village Parra em Ilha Solteira (Plus Code: HJ6X+3X)
const LOTEAMENTO_COORDS: [number, number] = [-20.4398125, -51.3500625];

// Haversine formula to compute distance in km
function getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDistance(distKm: number): string {
  if (distKm < 1) {
    return `${Math.round(distKm * 1000)} m`;
  }
  return `${distKm.toFixed(1)} km`;
}

interface ProximityInfo {
  label: string;
  sub: string;
  badgeText: string;
  walkingMin: number;
  carMin: number;
  colorClass: string;
}

function getProximityInfo(distKm: number): ProximityInfo {
  const walkingSpeed = 4.8; // km/h
  const carSpeed = 30.0; // km/h (velocidade média urbana)
  
  const walkingMin = Math.max(1, Math.round((distKm / walkingSpeed) * 60));
  const carMin = Math.max(1, Math.round((distKm / carSpeed) * 60));
  
  if (distKm < 0.1) {
    return {
      label: "Pertíssimo! Pouquíssimos passos de distância 😍",
      sub: "Literalmente vizinho ao loteamento. Conveniência total sem precisar de carro.",
      badgeText: `A pé: ${walkingMin} min`,
      walkingMin,
      carMin,
      colorClass: "bg-emerald-500 text-white"
    };
  } else if (distKm < 0.4) {
    return {
      label: "Muito perto! Dá pra ir a pé tranquilamente 🚶",
      sub: `Apenas ${walkingMin} min de caminhada. Ideal para a rotina diária.`,
      badgeText: `A pé: ${walkingMin} min`,
      walkingMin,
      carMin,
      colorClass: "bg-emerald-600 text-white"
    };
  } else if (distKm < 0.9) {
    return {
      label: "Bem próximo! A poucos minutos de bike ou caminhada 🚲",
      sub: `Fica a ${walkingMin} min de caminhada leve ou apenas ${carMin} min de carro.`,
      badgeText: `A pé: ${walkingMin} min`,
      walkingMin,
      carMin,
      colorClass: "bg-teal-600 text-white"
    };
  } else if (distKm < 1.6) {
    return {
      label: "Localização estratégica! Rapidinho de carro 🚗",
      sub: `Cerca de ${carMin} min de carro pelas principais avenidas. Muito prático!`,
      badgeText: `Carro: ${carMin} min`,
      walkingMin,
      carMin,
      colorClass: "bg-[#004777] text-white"
    };
  } else {
    return {
      label: "Fácil acesso em poucos minutos de carro 🚗",
      sub: `Apenas ${carMin} min dirigindo pelas vias centrais de Ilha Solteira.`,
      badgeText: `Carro: ${carMin} min`,
      walkingMin,
      carMin,
      colorClass: "bg-zinc-700 text-white"
    };
  }
}

// Subcomponent that handles mouse clicks directly on the Leaflet map
function MapClickHandler({ onMapClick }: { onMapClick: (latlng: L.LatLng) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
}

export default function LoteamentoProximidadeMap() {
  const [clickedCoords, setClickedCoords] = useState<[number, number] | null>(null);

  const activeDestination: [number, number] | null = clickedCoords;

  const distance = activeDestination
    ? getHaversineDistance(LOTEAMENTO_COORDS[0], LOTEAMENTO_COORDS[1], activeDestination[0], activeDestination[1])
    : null;

  return (
    <div className="flex flex-col lg:flex-row gap-6 bg-white p-6 rounded-3xl border border-zinc-200 shadow-xl overflow-hidden">
      {/* Sidebar controls */}
      <div className="w-full lg:w-1/3 flex flex-col gap-6 shrink-0 justify-between">
        <div className="space-y-6">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-primary">Mobilidade Urbana</span>
            <h3 className="font-extrabold text-brand-text text-xl mt-1">Calcular Distâncias</h3>
            <p className="text-xs text-brand-text/60 mt-1.5 leading-relaxed">
              Clique em qualquer local no mapa à direita para traçar a rota em linha reta e ver estimativas de tempo a pé ou de carro até o Loteamento Village Parra.
            </p>
          </div>
        </div>

        {/* Selected / Distance Display Panel */}
        <div className="mt-8 border-t border-zinc-100 pt-6">
          {activeDestination ? (
            (() => {
              const info = getProximityInfo(distance || 0);
              return (
                <div className="bg-zinc-50 border border-zinc-200/80 rounded-2xl p-4 flex flex-col gap-3 shadow-sm animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase font-bold text-brand-primary tracking-wider flex items-center gap-1">
                        <Navigation className="w-3.5 h-3.5 animate-pulse text-[#004777]" />
                        Ponto Selecionado
                      </span>
                      <h4 className="font-extrabold text-xs md:text-sm text-brand-text leading-tight max-w-[150px] md:max-w-[200px] truncate">
                        Coordenadas: {activeDestination[0].toFixed(5)}, {activeDestination[1].toFixed(5)}
                      </h4>
                    </div>
                    <div className={`px-2.5 py-1 rounded-full text-[9px] font-black shadow-sm shrink-0 uppercase tracking-wider ${info.colorClass}`}>
                      {info.badgeText}
                    </div>
                  </div>
                  
                  <div className="border-t border-zinc-200/60 pt-2.5 space-y-1">
                    <p className="text-xs font-black text-zinc-900">{info.label}</p>
                    <p className="text-[10px] text-zinc-500 font-medium leading-relaxed">{info.sub}</p>
                    <div className="text-[9px] font-bold text-zinc-400 flex flex-wrap gap-x-3 gap-y-1 pt-1.5">
                      <span>📏 Distância: {distance != null ? formatDistance(distance) : ""}</span>
                      <span>🚗 Carro: ~{info.carMin} min</span>
                      <span>🚶 Caminhando: ~{info.walkingMin} min</span>
                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="text-xs text-zinc-400 font-medium italic text-center py-6 border border-dashed border-zinc-200 rounded-2xl bg-zinc-50/50">
              Nenhum ponto selecionado. Clique em qualquer local do mapa para traçar a rota.
            </div>
          )}
        </div>
      </div>

      {/* Interactive Map Area */}
      <div className="w-full lg:w-2/3 h-[420px] rounded-3xl overflow-hidden border border-zinc-200 shadow-inner relative z-10">
        <MapContainer
          center={LOTEAMENTO_COORDS}
          zoom={14}
          className="w-full h-full"
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Subdivision / Origin Pin */}
          <Marker
            position={LOTEAMENTO_COORDS}
            icon={L.divIcon({
              className: "loteamento-marker-pin",
              html: `<div class="w-10 h-10 rounded-full bg-brand-primary border-4 border-white flex items-center justify-center shadow-2xl text-white transform hover:scale-105 transition-all" style="background-color: #004777"><span class="text-xs">🏡</span></div>`,
              iconSize: [40, 40],
              iconAnchor: [20, 20],
            })}
          >
            <Popup>
              <div className="p-1">
                <h4 className="font-extrabold text-zinc-950 text-xs">Loteamento Village Parra</h4>
                <p className="text-[10px] text-zinc-500 font-medium leading-relaxed mt-0.5">Origem do Empreendimento</p>
              </div>
            </Popup>
          </Marker>

          {/* Temporary pin for clicked point */}
          {clickedCoords && (
            <Marker
              position={clickedCoords}
              icon={L.divIcon({
                className: "custom-click-pin",
                html: `<div class="w-7 h-7 rounded-full bg-amber-500 border-2 border-white shadow-xl flex items-center justify-center text-xs animate-bounce">📍</div>`,
                iconSize: [28, 28],
                iconAnchor: [14, 28],
              })}
            />
          )}

          {/* Dashed line route highlight connecting allotment to clicked point */}
          {activeDestination && (
            <>
              {/* Outer halo shadow for route highlight */}
              <Polyline
                positions={[LOTEAMENTO_COORDS, activeDestination]}
                pathOptions={{ color: "#004777", weight: 8, opacity: 0.2, lineCap: "round" }}
              />
              
              {/* Inner dashed line */}
              <Polyline
                positions={[LOTEAMENTO_COORDS, activeDestination]}
                pathOptions={{ color: "#004777", weight: 3, dashArray: "6, 10", lineCap: "round" }}
              />

              {/* Floating route tooltip at the midpoint */}
              {(() => {
                const midLat = (LOTEAMENTO_COORDS[0] + activeDestination[0]) / 2;
                const midLng = (LOTEAMENTO_COORDS[1] + activeDestination[1]) / 2;
                const info = getProximityInfo(distance || 0);
                return (
                  <Marker
                    position={[midLat, midLng]}
                    icon={L.divIcon({
                      className: "route-midpoint-badge",
                      html: `<div class="bg-[#004777] text-white px-2.5 py-1 rounded-full text-[9px] font-black shadow-lg whitespace-nowrap border-2 border-white flex items-center gap-1 scale-102 transform -translate-y-1">
                        <span>🚀</span>
                        <span>${distance != null ? formatDistance(distance) : ""} (${info.badgeText})</span>
                      </div>`,
                      iconSize: [120, 24],
                      iconAnchor: [60, 12]
                    })}
                  />
                );
              })()}
            </>
          )}

          {/* Captures click events */}
          <MapClickHandler
            onMapClick={(latlng) => {
              setClickedCoords([latlng.lat, latlng.lng]);
            }}
          />
        </MapContainer>
      </div>
    </div>
  );
}
