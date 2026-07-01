"use client";

import React, { useState } from "react";
import { Plus, Trash2, Grid2X2 } from "lucide-react";
import { Room, RoomType } from "./FloorPlanVisualizer";

interface RoomBuilderFormProps {
  rooms: Room[];
  onAddRoom: (room: Room) => void;
  onRemoveRoom: (id: string) => void;
}

const roomTypes: RoomType[] = [
  'Quarto', 'Sala', 'Cozinha', 'Banheiro', 'Varanda', 'Garagem', 'Corredor', 'Outro'
];

export function RoomBuilderForm({ rooms, onAddRoom, onRemoveRoom }: RoomBuilderFormProps) {
  const [selectedType, setSelectedType] = useState<RoomType>('Quarto');
  const [roomName, setRoomName] = useState("");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) return;

    const newRoom: Room = {
      id: Math.random().toString(36).substr(2, 9),
      type: selectedType,
      name: roomName.trim(),
    };

    onAddRoom(newRoom);
    setRoomName(""); // reset name
  };

  return (
    <div className="w-full h-full min-h-[500px] bg-white rounded-2xl border border-[#EEEEF3] shadow-sm p-6 sm:p-8 flex flex-col transition-all duration-300">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-[#280003] flex items-center gap-2">
          <Grid2X2 className="w-5 h-5 text-[#004777]" />
          Adicionar Ambientes
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Defina a composição do imóvel adicionando os cômodos. Eles aparecerão dinamicamente na visualização da planta.
        </p>
      </div>

      <form onSubmit={handleAdd} className="flex flex-col gap-4 mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Tipo de Ambiente
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as RoomType)}
              className="px-3 py-2.5 bg-[#EEEEF3]/50 border border-[#EEEEF3] rounded-lg text-sm text-[#280003] focus:outline-none focus:ring-2 focus:ring-[#004777]/20 transition-all"
            >
              {roomTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Identificação (ex: Quarto Casal)
            </label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Nome do ambiente..."
              className="px-3 py-2.5 bg-[#EEEEF3]/50 border border-[#EEEEF3] rounded-lg text-sm text-[#280003] placeholder-[#280003]/40 focus:outline-none focus:ring-2 focus:ring-[#004777]/20 transition-all"
            />
          </div>
        </div>

        <button 
          type="submit"
          disabled={!roomName.trim()}
          className="self-end px-5 py-2.5 bg-[#004777] text-white rounded-lg text-sm font-semibold hover:bg-[#00365a] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Adicionar Ambiente
        </button>
      </form>

      <div className="flex-1 flex flex-col min-h-[200px]">
        <h4 className="text-xs font-bold text-[#004777] uppercase tracking-widest mb-3 border-b border-[#EEEEF3] pb-2">
          Ambientes Adicionados ({rooms.length})
        </h4>
        
        {rooms.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400 font-medium">
            A composição está vazia.
          </div>
        ) : (
          <ul className="flex flex-col gap-2 overflow-y-auto pr-2 pb-4">
            {rooms.map((room) => (
              <li 
                key={room.id}
                className="flex items-center justify-between p-3 rounded-xl border border-[#EEEEF3] bg-gray-50 hover:bg-white hover:shadow-sm transition-all group"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-[#280003]">{room.name}</span>
                  <span className="text-xs text-gray-500 font-medium">{room.type}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveRoom(room.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                  title="Remover ambiente"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
