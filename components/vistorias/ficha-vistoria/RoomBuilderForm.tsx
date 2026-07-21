"use client";

import React, { useState } from "react";
import { Plus, Trash2, Grid2X2 } from "lucide-react";
import { Room, RoomType } from "./FloorPlanVisualizer";

interface RoomBuilderFormProps {
  rooms: Room[];
  onAddRoom: (room: Room) => void;
  onRemoveRoom: (id: string) => void;
  onUpdateRoom?: (id: string, updates: Partial<Room>) => void;
  onReorderRooms?: (newRooms: Room[]) => void;
}

const roomTypes: RoomType[] = [
  'Quarto', 'Sala', 'Cozinha', 'Banheiro', 'Varanda', 'Garagem', 'Corredor', 'Outro'
];

function generateUUID(): string {
  if (typeof window !== "undefined" && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  const cryptoObj = typeof window !== "undefined" ? window.crypto : null;
  if (cryptoObj && cryptoObj.getRandomValues) {
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c: any) =>
      (Number(c) ^ (cryptoObj.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(c) / 4)))).toString(16)
    );
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function RoomBuilderForm({
  rooms,
  onAddRoom,
  onRemoveRoom,
  onUpdateRoom,
  onReorderRooms
}: RoomBuilderFormProps) {
  const [selectedType, setSelectedType] = useState<RoomType>('Quarto');
  const [roomName, setRoomName] = useState("");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) return;

    const newRoom: Room = {
      id: generateUUID(),
      type: selectedType,
      name: roomName.trim(),
      visaoGeral: "",
      comentarios: ""
    };

    onAddRoom(newRoom);
    setRoomName(""); // reset name
  };

  const moveRoom = (index: number, direction: 'up' | 'down') => {
    if (!onReorderRooms) return;
    const newRooms = [...rooms];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= rooms.length) return;

    // Swap
    const temp = newRooms[index];
    newRooms[index] = newRooms[targetIndex];
    newRooms[targetIndex] = temp;

    onReorderRooms(newRooms);
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
          <ul className="flex flex-col gap-3 overflow-y-auto pr-2 pb-4">
            {rooms.map((room, index) => (
              <li
                key={room.id}
                className="flex flex-col p-4 rounded-xl border border-[#EEEEF3] bg-gray-50 hover:bg-white hover:shadow-sm transition-all group gap-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-[#280003]">{room.name}</span>
                    <span className="text-xs text-gray-500 font-medium">{room.type}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Botões de reordenação */}
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveRoom(index, 'up')}
                      className="p-1.5 text-gray-400 hover:text-[#004777] hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30"
                      title="Subir ambiente"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      disabled={index === rooms.length - 1}
                      onClick={() => moveRoom(index, 'down')}
                      className="p-1.5 text-gray-400 hover:text-[#004777] hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30"
                      title="Descer ambiente"
                    >
                      ▼
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveRoom(room.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remover ambiente"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Campos de texto adicionais para visão geral e comentários */}
                {/*  {onUpdateRoom && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1 pt-3 border-t border-[#EEEEF3]">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-[#004777] uppercase tracking-wider">
                        Visão Geral
                      </label>
                      <input
                        type="text"
                        value={room.visaoGeral || ""}
                        onChange={(e) => onUpdateRoom(room.id, { visaoGeral: e.target.value })}
                        placeholder="Ex: Pintura nova, piso ok..."
                        className="px-2.5 py-1.5 bg-white border border-[#EEEEF3] rounded-lg text-xs text-[#280003] focus:outline-none focus:ring-1 focus:ring-[#004777]"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-[#004777] uppercase tracking-wider">
                        Comentários
                      </label>
                      <input
                        type="text"
                        value={room.comentarios || ""}
                        onChange={(e) => onUpdateRoom(room.id, { comentarios: e.target.value })}
                        placeholder="Ex: Detalhes do cômodo..."
                        className="px-2.5 py-1.5 bg-white border border-[#EEEEF3] rounded-lg text-xs text-[#280003] focus:outline-none focus:ring-1 focus:ring-[#004777]"
                      />
                    </div>
                  </div>
                )} */}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
