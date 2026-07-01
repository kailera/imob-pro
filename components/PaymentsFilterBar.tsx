import { Search } from "lucide-react";

export default function PaymentsFilterBar() {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col md:flex-row items-center gap-4">
      {/* Busca */}
      <div className="relative flex-1 w-full">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Buscar por Nome do Proprietário..."
          className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-[#004777] focus:ring-1 focus:ring-[#004777] sm:text-sm transition-colors"
        />
      </div>

      {/* Filtros */}
      <div className="flex w-full md:w-auto items-center gap-3">
        <select className="block w-full md:w-auto pl-3 pr-10 py-2 text-base border border-gray-200 focus:outline-none focus:ring-[#004777] focus:border-[#004777] sm:text-sm rounded-xl bg-gray-50 text-gray-700">
          <option value="">Mês de Competência</option>
          <option value="06/2026">Junho 2026</option>
          <option value="05/2026">Maio 2026</option>
          <option value="04/2026">Abril 2026</option>
        </select>

        <select className="block w-full md:w-auto pl-3 pr-10 py-2 text-base border border-gray-200 focus:outline-none focus:ring-[#004777] focus:border-[#004777] sm:text-sm rounded-xl bg-gray-50 text-gray-700">
          <option value="">Status do Pagamento</option>
          <option value="pago">Pago</option>
          <option value="pendente">Pendente</option>
        </select>

        <select className="block w-full md:w-auto pl-3 pr-10 py-2 text-base border border-gray-200 focus:outline-none focus:ring-[#004777] focus:border-[#004777] sm:text-sm rounded-xl bg-gray-50 text-gray-700">
          <option value="">Status da NF-e</option>
          <option value="emitida">Emitida</option>
          <option value="pendente">Pendente</option>
          <option value="erro">Erro</option>
        </select>
      </div>
    </div>
  );
}
