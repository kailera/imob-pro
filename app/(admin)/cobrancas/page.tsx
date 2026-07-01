import React from 'react';
import FinancialFilterBar from '@/components/FinancialFilterBar';
import FinancialTable, { BilletData } from '@/components/FinancialTable';
import FinancialSummary from '@/components/FinancialSummary';

const mockData: BilletData[] = [
  {
    id: '1',
    recepcaoData: '25/06/2026',
    recepcaoHora: '10:15',
    movimentoData: '25/06/2026',
    movimentoHora: '10:15',
    vencimento: '30/06/2026',
    situacao: 'Liquidado',
    valor: 2500.00,
    cedente: 'Imob Pro',
    sacadoNome: 'João Silva Oliveira',
    sacadoCpf: '111.222.333-44',
    pagamentoData: '24/06/2026',
    pagamentoValor: 2500.00,
  },
  {
    id: '2',
    recepcaoData: '24/06/2026',
    recepcaoHora: '14:30',
    movimentoData: '24/06/2026',
    movimentoHora: '14:30',
    vencimento: '05/07/2026',
    situacao: 'Recepcionado',
    valor: 1850.50,
    cedente: 'Imob Pro',
    sacadoNome: 'Maria Mendes',
    sacadoCpf: '222.333.444-55',
    pagamentoData: null,
    pagamentoValor: null,
  },
  {
    id: '3',
    recepcaoData: '23/06/2026',
    recepcaoHora: '09:00',
    movimentoData: '23/06/2026',
    movimentoHora: '09:00',
    vencimento: '20/06/2026',
    situacao: 'Pendente',
    valor: 3200.00,
    cedente: 'Imob Pro',
    sacadoNome: 'Carlos Drummond',
    sacadoCpf: '333.444.555-66',
    pagamentoData: null,
    pagamentoValor: null,
  },
  {
    id: '4',
    recepcaoData: '22/06/2026',
    recepcaoHora: '11:45',
    movimentoData: '22/06/2026',
    movimentoHora: '11:45',
    vencimento: '25/06/2026',
    situacao: 'Cancelado',
    valor: 1500.00,
    cedente: 'Imob Pro',
    sacadoNome: 'Ana Paula Rocha',
    sacadoCpf: '444.555.666-77',
    pagamentoData: null,
    pagamentoValor: null,
  },
  {
    id: '5',
    recepcaoData: '21/06/2026',
    recepcaoHora: '16:20',
    movimentoData: '21/06/2026',
    movimentoHora: '16:20',
    vencimento: '10/06/2026',
    situacao: 'Liquidado',
    valor: 4100.00,
    cedente: 'Imob Pro',
    sacadoNome: 'Empresa Fictícia LTDA',
    sacadoCpf: '12.345.678/0001-99',
    pagamentoData: '09/06/2026',
    pagamentoValor: 4100.00,
  }
];

const totals = {
  registrado: 13150.50,
  liquidado: 6600.00,
  baixado: 0.00,
  recepcionado: 1850.50,
  cancelado: 1500.00
};

export default function CobrancasPage() {
  return (
    <div className="min-h-screen bg-[#EEEEF3] p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#280003]">Cobranças de Aluguéis</h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie os recebimentos, boletos e repasses</p>
        </div>

        <FinancialFilterBar />
        <FinancialSummary totals={totals} />
        <FinancialTable data={mockData} />
      </div>
    </div>
  );
}
