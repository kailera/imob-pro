"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  codigo: string;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteConfirmModal({
  isOpen,
  codigo,
  onClose,
  onConfirm,
}: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#280003]/40 z-50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-zinc-200 animate-scale-up">
        <div className="p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#280003]">Confirmar Exclusão</h3>
            <p className="text-sm text-[#280003]/60 mt-2">
              Deseja realmente excluir o imóvel <span className="font-bold text-[#004777]">{codigo}</span>? 
              Esta ação é irreversível e excluirá todos os dados associados.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2 text-sm font-semibold rounded-xl transition-all cursor-pointer shadow-sm"
            >
              Confirmar e Excluir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
