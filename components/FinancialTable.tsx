import React from 'react';

export type BilletStatus = 'Liquidado' | 'Recepcionado' | 'Pendente' | 'Cancelado' | 'Baixado';

export interface BilletData {
  id: string;
  recepcaoData: string;
  recepcaoHora: string;
  movimentoData: string;
  movimentoHora: string;
  vencimento: string;
  situacao: BilletStatus;
  valor: number;
  cedente: string;
  sacadoNome: string;
  sacadoCpf: string;
  pagamentoData: string | null;
  pagamentoValor: number | null;
}

interface TableProps {
  data: BilletData[];
}

const getStatusBadge = (status: BilletStatus) => {
  switch (status) {
    case 'Liquidado':
      return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-[#708D81]/10 text-[#708D81]">Liquidado</span>;
    case 'Recepcionado':
    case 'Pendente':
      return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-[#F0D18A]/20 text-[#D4A017]">{status}</span>;
    case 'Cancelado':
      return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700">Cancelado</span>;
    case 'Baixado':
      return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">Baixado</span>;
    default:
      return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{status}</span>;
  }
};

const formatCurrency = (value: number | null) => {
  if (value === null) return '-';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export default function FinancialTable({ data }: TableProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm w-full overflow-x-auto mt-6">
      <table className="w-full text-left text-sm divide-y divide-gray-100">
        <thead>
          <tr className="bg-gray-50/50">
            <th className="px-4 py-4 font-semibold text-[#280003]/80">Recepção</th>
            <th className="px-4 py-4 font-semibold text-[#280003]/80">Movimento</th>
            <th className="px-4 py-4 font-semibold text-[#280003]/80">Vencimento</th>
            <th className="px-4 py-4 font-semibold text-[#280003]/80">Situação</th>
            <th className="px-4 py-4 font-semibold text-[#280003]/80 text-right">Valor (R$)</th>
            <th className="px-4 py-4 font-semibold text-[#280003]/80">Cedente</th>
            <th className="px-4 py-4 font-semibold text-[#280003]/80">Sacado</th>
            <th className="px-4 py-4 font-semibold text-[#280003]/80 text-right">Pagamento</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((item) => (
            <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="text-[#280003]">{item.recepcaoData}</div>
                <div className="text-xs text-gray-500">{item.recepcaoHora}</div>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="text-[#280003]">{item.movimentoData}</div>
                <div className="text-xs text-gray-500">{item.movimentoHora}</div>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="text-[#280003]">{item.vencimento}</div>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                {getStatusBadge(item.situacao)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-right font-medium text-[#280003]">
                {formatCurrency(item.valor)}
              </td>
              <td className="px-4 py-3">
                <div className="text-[#280003] truncate max-w-[150px]">{item.cedente}</div>
              </td>
              <td className="px-4 py-3">
                <div className="text-[#280003] font-medium truncate max-w-[180px]">{item.sacadoNome}</div>
                <div className="text-xs text-gray-500">{item.sacadoCpf}</div>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-right">
                <div className="text-[#280003]">{item.pagamentoData || '-'}</div>
                <div className="text-xs text-gray-500 font-medium">
                  {item.pagamentoValor ? formatCurrency(item.pagamentoValor) : ''}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
