import React, { useMemo } from 'react';
import { Search, Filter } from 'lucide-react';

export interface FilterState {
  dateField: string;
  status: string;
  banco: string;
  conta: string;
  startDate: string;
  endDate: string;
  mesReferencia: string;
  search: string;
}

interface FilterBarProps {
  filters: FilterState;
  onChange: (updates: Partial<FilterState>) => void;
  onApply: () => void;
}

export default function FinancialFilterBar({ filters, onChange, onApply }: FilterBarProps) {
  // Generate last 12 months and next 6 months
  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    // Use Portuguese locale for month names
    for (let i = -12; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const label = d.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
      // Format as YYYY-MM
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      options.push({ label, value });
    }
    return options.reverse();
  }, []);

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'TODOS') {
      onChange({
        mesReferencia: 'TODOS',
        startDate: '',
        endDate: '',
      });
    } else {
      const [year, month] = val.split('-').map(Number);
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      onChange({
        mesReferencia: val,
        startDate,
        endDate,
      });
    }
  };

  const isCustomDateDisabled = filters.mesReferencia !== 'TODOS';

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 w-full space-y-4 border border-gray-100/80">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Tipo de Data */}
        <div className="flex flex-col space-y-1">
          <label className="text-xs font-semibold text-[#280003]/70">Tipo de Data</label>
          <select 
            value={filters.dateField}
            onChange={(e) => onChange({ dateField: e.target.value })}
            className="border border-gray-200 rounded-xl p-2 text-sm text-[#280003] bg-white focus:outline-none focus:ring-1 focus:ring-[#004777] cursor-pointer"
          >
            <option value="vencimento">Data (Vencimento)</option>
            <option value="recepcao">Data (Recepção)</option>
            <option value="pagamento">Data (Pagamento)</option>
            <option value="movimento">Data (Movimento)</option>
          </select>
        </div>

        {/* Situação */}
        <div className="flex flex-col space-y-1">
          <label className="text-xs font-semibold text-[#280003]/70">Situação</label>
          <select 
            value={filters.status}
            onChange={(e) => onChange({ status: e.target.value })}
            className="border border-gray-200 rounded-xl p-2 text-sm text-[#280003] bg-white focus:outline-none focus:ring-1 focus:ring-[#004777] cursor-pointer"
          >
            <option value="Todas">Todas</option>
            <option value="Pendente">Pendente</option>
            <option value="Liquidado">Liquidado</option>
            <option value="Cancelado">Cancelado</option>
            <option value="Recepcionado">Recepcionado</option>
          </select>
        </div>

        {/* Mês de Referência */}
        <div className="flex flex-col space-y-1">
          <label className="text-xs font-semibold text-[#280003]/70">Mês de Referência</label>
          <select 
            value={filters.mesReferencia}
            onChange={handleMonthChange}
            className="border border-gray-200 rounded-xl p-2 text-sm text-[#280003] bg-white focus:outline-none focus:ring-1 focus:ring-[#004777] cursor-pointer font-medium"
          >
            <option value="TODOS">Todos os meses</option>
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label.charAt(0).toUpperCase() + opt.label.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Banco */}
        <div className="flex flex-col space-y-1">
          <label className="text-xs font-semibold text-[#280003]/70">Banco</label>
          <select 
            value={filters.banco}
            onChange={(e) => onChange({ banco: e.target.value })}
            className="border border-gray-200 rounded-xl p-2 text-sm text-[#280003] bg-white focus:outline-none focus:ring-1 focus:ring-[#004777] cursor-pointer"
          >
            <option value="Todos">Todos</option>
            <option value="077 - Banco Inter">077 - Banco Inter</option>
          </select>
        </div>

        {/* Conta */}
        <div className="flex flex-col space-y-1">
          <label className="text-xs font-semibold text-[#280003]/70">Conta</label>
          <select 
            value={filters.conta}
            onChange={(e) => onChange({ conta: e.target.value })}
            className="border border-gray-200 rounded-xl p-2 text-sm text-[#280003] bg-white focus:outline-none focus:ring-1 focus:ring-[#004777] cursor-pointer"
          >
            <option value="Todas as contas">Todas as contas</option>
            <option value="45033751-0">Corrente - 45033751-0</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
        {/* Data Inicial */}
        <div className="flex flex-col space-y-1 md:col-span-2">
          <label className="text-xs font-semibold text-[#280003]/70">Data Inicial</label>
          <input 
            type="date" 
            value={filters.startDate}
            onChange={(e) => onChange({ startDate: e.target.value })}
            disabled={isCustomDateDisabled}
            className="border border-gray-200 rounded-xl p-2 text-sm text-[#280003] focus:outline-none focus:ring-1 focus:ring-[#004777] disabled:bg-gray-50 disabled:text-gray-400" 
          />
        </div>

        {/* Data Final */}
        <div className="flex flex-col space-y-1 md:col-span-2">
          <label className="text-xs font-semibold text-[#280003]/70">Data Final</label>
          <input 
            type="date" 
            value={filters.endDate}
            onChange={(e) => onChange({ endDate: e.target.value })}
            disabled={isCustomDateDisabled}
            className="border border-gray-200 rounded-xl p-2 text-sm text-[#280003] focus:outline-none focus:ring-1 focus:ring-[#004777] disabled:bg-gray-50 disabled:text-gray-400" 
          />
        </div>

        {/* Nome ou cpf/cnpj do sacado */}
        <div className="flex flex-col space-y-1 md:col-span-6 relative">
          <label className="text-xs font-semibold text-[#280003]/70">Sacado</label>
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Nome ou CPF/CNPJ do sacado" 
              value={filters.search}
              onChange={(e) => onChange({ search: e.target.value })}
              className="pl-10 w-full border border-gray-200 rounded-xl p-2.5 text-sm text-[#280003] focus:outline-none focus:ring-1 focus:ring-[#004777]" 
              onKeyDown={(e) => {
                if (e.key === 'Enter') onApply();
              }}
            />
          </div>
        </div>

        {/* Botão Filtrar */}
        <div className="md:col-span-2">
          <button 
            onClick={onApply}
            className="w-full flex items-center justify-center gap-2 bg-[#004777] hover:bg-[#00385e] text-white py-2.5 px-4 rounded-xl font-bold transition-all text-sm cursor-pointer shadow-sm"
          >
            <Filter className="h-4 w-4" />
            Filtrar
          </button>
        </div>
      </div>
    </div>
  );
}
