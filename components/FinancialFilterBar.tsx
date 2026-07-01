import React from 'react';
import { Search, Filter } from 'lucide-react';

export default function FinancialFilterBar() {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 w-full space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Data (Movimento) */}
        <div className="flex flex-col space-y-1">
          <label className="text-xs font-medium text-[#280003]/70">Tipo de Data</label>
          <select className="border border-gray-200 rounded-lg p-2 text-sm text-[#280003] focus:outline-none focus:ring-1 focus:ring-[#004777]">
            <option>Data (Movimento)</option>
            <option>Data (Vencimento)</option>
            <option>Data (Recepção)</option>
            <option>Data (Pagamento)</option>
          </select>
        </div>

        {/* Situação */}
        <div className="flex flex-col space-y-1">
          <label className="text-xs font-medium text-[#280003]/70">Situação</label>
          <select className="border border-gray-200 rounded-lg p-2 text-sm text-[#280003] focus:outline-none focus:ring-1 focus:ring-[#004777]">
            <option>Todas</option>
            <option>Liquidado</option>
            <option>Recepcionado</option>
            <option>Pendente</option>
            <option>Cancelado</option>
          </select>
        </div>

        {/* Banco */}
        <div className="flex flex-col space-y-1">
          <label className="text-xs font-medium text-[#280003]/70">Banco</label>
          <select className="border border-gray-200 rounded-lg p-2 text-sm text-[#280003] focus:outline-none focus:ring-1 focus:ring-[#004777]">
            <option>Todos</option>
            <option>Banco do Brasil</option>
            <option>Caixa Econômica</option>
            <option>Itaú</option>
            <option>Bradesco</option>
          </select>
        </div>

        {/* Conta */}
        <div className="flex flex-col space-y-1">
          <label className="text-xs font-medium text-[#280003]/70">Conta</label>
          <select className="border border-gray-200 rounded-lg p-2 text-sm text-[#280003] focus:outline-none focus:ring-1 focus:ring-[#004777]">
            <option>Todas as contas</option>
            <option>Conta Principal - 1234-5</option>
            <option>Conta Reserva - 5432-1</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
         {/* Data Inicial */}
         <div className="flex flex-col space-y-1 md:col-span-2">
          <label className="text-xs font-medium text-[#280003]/70">Data Inicial</label>
          <input type="date" className="border border-gray-200 rounded-lg p-2 text-sm text-[#280003] focus:outline-none focus:ring-1 focus:ring-[#004777]" />
        </div>

        {/* Data Final */}
         <div className="flex flex-col space-y-1 md:col-span-2">
          <label className="text-xs font-medium text-[#280003]/70">Data Final</label>
          <input type="date" className="border border-gray-200 rounded-lg p-2 text-sm text-[#280003] focus:outline-none focus:ring-1 focus:ring-[#004777]" />
        </div>

        {/* Nome ou cpf/cnpj do sacado */}
        <div className="flex flex-col space-y-1 md:col-span-6 relative">
          <label className="text-xs font-medium text-[#280003]/70">Sacado</label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Nome ou CPF/CNPJ do sacado" 
              className="pl-9 w-full border border-gray-200 rounded-lg p-2 text-sm text-[#280003] focus:outline-none focus:ring-1 focus:ring-[#004777]" 
            />
          </div>
        </div>

        {/* Botão Filtrar */}
        <div className="md:col-span-2">
          <button className="w-full flex items-center justify-center gap-2 bg-[#004777] hover:bg-[#00385e] text-white py-2 px-4 rounded-lg font-medium transition-colors text-sm">
            <Filter className="h-4 w-4" />
            Filtrar
          </button>
        </div>
      </div>
    </div>
  );
}
