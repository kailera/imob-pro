"use client";

import React from "react";
import { BedDouble, Bath, Sofa, Utensils, Box, Car, LayoutGrid } from "lucide-react";

export type RoomType = 'Quarto' | 'Sala' | 'Cozinha' | 'Banheiro' | 'Varanda' | 'Garagem' | 'Corredor' | 'Outro';

export interface Room {
  id: string;
  type: RoomType;
  name: string;
  visaoGeral?: string;
  comentarios?: string;
}

interface FloorPlanVisualizerProps {
  rooms: Room[];
}

const getRoomIcon = (type: RoomType) => {
  switch (type) {
    case 'Quarto': return <BedDouble className="w-6 h-6 text-gray-300" strokeWidth={1.5} />;
    case 'Banheiro': return <Bath className="w-6 h-6 text-gray-300" strokeWidth={1.5} />;
    case 'Sala': return <Sofa className="w-6 h-6 text-gray-300" strokeWidth={1.5} />;
    case 'Cozinha': return <Utensils className="w-6 h-6 text-gray-300" strokeWidth={1.5} />;
    case 'Garagem': return <Car className="w-6 h-6 text-gray-300" strokeWidth={1.5} />;
    case 'Varanda': return <LayoutGrid className="w-6 h-6 text-gray-300" strokeWidth={1.5} />;
    default: return <Box className="w-6 h-6 text-gray-300" strokeWidth={1.5} />;
  }
};

const getRoomSpan = (type: RoomType) => {
  switch (type) {
    case 'Sala': return 'col-span-2 row-span-2';
    case 'Quarto': return 'col-span-2 row-span-1';
    case 'Cozinha': return 'col-span-1 row-span-2';
    case 'Varanda': return 'col-span-3 row-span-1';
    case 'Corredor': return 'col-span-3 row-span-1';
    default: return 'col-span-1 row-span-1';
  }
};

const getRoomArea = (type: RoomType) => {
  switch (type) {
    case 'Sala': return '15.5 m²';
    case 'Quarto': return '12.0 m²';
    case 'Cozinha': return '10.5 m²';
    case 'Varanda': return '8.0 m²';
    case 'Corredor': return '4.5 m²';
    case 'Banheiro': return '6.0 m²';
    default: return '10.0 m²';
  }
};

export function FloorPlanVisualizer({ rooms }: FloorPlanVisualizerProps) {
  if (rooms.length === 0) {
    return (
      <div className="w-full h-full min-h-[400px] border-4 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-400 bg-gray-50/50">
        <LayoutGrid className="w-12 h-12 mb-4 text-gray-300" strokeWidth={1} />
        <p className="text-sm font-medium">Nenhum ambiente adicionado.</p>
        <p className="text-xs text-gray-400 mt-1 text-center max-w-[250px]">
          Adicione ambientes no formulário para gerar a planta dinamicamente.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[500px] bg-white rounded-2xl border border-[#EEEEF3] shadow-sm p-6 sm:p-10 flex items-center justify-center relative overflow-hidden transition-all duration-500 group">
      
      {/* Blueprint Grid Background Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none" 
        style={{
          backgroundImage: `linear-gradient(#004777 1px, transparent 1px), linear-gradient(90deg, #004777 1px, transparent 1px)`,
          backgroundSize: '20px 20px'
        }}
      />
      
      {/* Outer Walls - Thick Black Border simulating exterior walls */}
      <div className="w-full max-w-2xl bg-[#fdfdfd] border-[6px] border-[#1a1a1a] shadow-inner relative p-1 grid grid-cols-3 md:grid-cols-4 gap-1 auto-rows-[minmax(100px,auto)] transition-all duration-500">
        
        {/* Entry Door - Mocked absolute element */}
        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-12 h-3 bg-white z-10 flex items-center justify-center">
           <div className="w-full h-0.5 bg-gray-300"></div>
        </div>

        {rooms.map((room, index) => (
          <div 
            key={room.id} 
            className={`
              relative bg-white border-[3px] border-[#2c2c2c] p-3 flex flex-col items-center justify-center
              hover:bg-[#004777]/5 transition-colors cursor-default
              ${getRoomSpan(room.type)}
            `}
          >
            {/* Mock Door Arc (Randomly placed based on index even/odd for visual effect) */}
            {index % 2 === 0 ? (
               <div className="absolute -left-[3px] top-4 w-[6px] h-8 bg-white z-10 flex items-center justify-start overflow-hidden">
                 <div className="w-6 h-8 border-t border-l border-dashed border-gray-400 rounded-tl-full -ml-6 mt-4 opacity-50"></div>
               </div>
            ) : (
               <div className="absolute -bottom-[3px] right-4 w-8 h-[6px] bg-white z-10 flex items-end justify-center overflow-hidden">
                  <div className="w-8 h-6 border-r border-b border-dashed border-gray-400 rounded-br-full -mb-6 mr-4 opacity-50"></div>
               </div>
            )}

            {/* Room Content */}
            <div className="flex flex-col items-center gap-2 z-0 relative">
              {getRoomIcon(room.type)}
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center leading-tight">
                  {room.name}
                </span>
                <span className="text-[8px] text-gray-400 mt-0.5">
                  {getRoomArea(room.type)}
                </span>
              </div>
            </div>

            {/* Mock Windows */}
            {room.type === 'Sala' && (
              <div className="absolute -top-[3px] left-1/2 -translate-x-1/2 w-16 h-[6px] bg-[#e0f2fe] border-x border-[#2c2c2c] z-10" />
            )}
            {room.type === 'Quarto' && (
              <div className="absolute -right-[3px] top-1/2 -translate-y-1/2 w-[6px] h-12 bg-[#e0f2fe] border-y border-[#2c2c2c] z-10" />
            )}
          </div>
        ))}
      </div>

      {/* Compass / Legend */}
      <div className="absolute bottom-6 left-6 flex items-center gap-2 opacity-50">
         <div className="w-8 h-8 rounded-full border border-gray-400 flex items-center justify-center text-[10px] font-bold text-gray-500">
           N
         </div>
      </div>
    </div>
  );
}
