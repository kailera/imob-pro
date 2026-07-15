import React from "react";
import ConfiguracoesClient from "./ConfiguracoesClient";

export default function ConfiguracoesPage() {
  return (
    <div className="min-h-screen bg-[#EEEEF3] p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-[#280003]">Configurações</h1>
        <p className="text-sm text-gray-500 mt-1">Gerencie as integrações e configurações do sistema.</p>
        <ConfiguracoesClient />
      </div>
    </div>
  );
}

