'use client';

import React, { useState, useEffect } from 'react';
import FinancialFilterBar from '@/components/FinancialFilterBar';
import FinancialTable, { BilletData } from '@/components/FinancialTable';
import FinancialSummary from '@/components/FinancialSummary';

const DEFAULT_COBRANCAS: BilletData[] = [
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

export default function CobrancasPage() {
  const [cobrancas, setCobrancas] = useState<BilletData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/financeiro/transacoes?categoria=ALUGUEL');
        if (!res.ok) throw new Error();
        const data = await res.json();
        
        if (data.length === 0) {
          // Inicializar banco com dados mockados de demonstração se estiver vazio
          const savedList: BilletData[] = [];
          for (const item of DEFAULT_COBRANCAS) {
            const parts = item.vencimento.split('/');
            const vencDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
            
            let pgDate = null;
            if (item.pagamentoData) {
              const pgParts = item.pagamentoData.split('/');
              pgDate = new Date(parseInt(pgParts[2]), parseInt(pgParts[1]) - 1, parseInt(pgParts[0]));
            }

            const postRes = await fetch('/api/financeiro/transacoes', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                descricao: `Aluguel - ${item.sacadoNome}`,
                valor: item.valor,
                tipo: 'RECEITA',
                categoria: 'ALUGUEL',
                status: item.situacao === 'Liquidado' ? 'LIQUIDADO' : item.situacao === 'Cancelado' ? 'CANCELADO' : 'PENDENTE',
                dataVencimento: vencDate.toISOString(),
                dataPagamento: pgDate ? pgDate.toISOString() : null
              })
            });
            if (postRes.ok) {
              const created = await postRes.json();
              savedList.push({
                ...item,
                id: created.id
              });
            }
          }
          setCobrancas(savedList);
        } else {
          // Mapear do banco de dados para a interface da tabela
          const mapped: BilletData[] = data.map((tx: any) => {
            const formatShortDate = (dStr: string | null) => {
              if (!dStr) return null;
              const d = new Date(dStr);
              return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
            };
            const formatTime = (dStr: string) => {
              const d = new Date(dStr);
              return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
            };

            const situacaoLabel = tx.status === 'LIQUIDADO' ? 'Liquidado' : tx.status === 'CANCELADO' ? 'Cancelado' : 'Recepcionado';

            return {
              id: tx.id,
              recepcaoData: formatShortDate(tx.createdAt) || '',
              recepcaoHora: formatTime(tx.createdAt),
              movimentoData: formatShortDate(tx.updatedAt) || '',
              movimentoHora: formatTime(tx.updatedAt),
              vencimento: formatShortDate(tx.dataVencimento) || '',
              situacao: situacaoLabel,
              valor: tx.valor,
              cedente: 'Imob Pro',
              sacadoNome: tx.descricao.replace('Aluguel - ', ''),
              sacadoCpf: '***.***.***-**',
              pagamentoData: formatShortDate(tx.dataPagamento),
              pagamentoValor: tx.status === 'LIQUIDADO' ? tx.valor : null,
            };
          });
          setCobrancas(mapped);
        }
      } catch (err) {
        console.error(err);
        setCobrancas(DEFAULT_COBRANCAS);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const totals = cobrancas.reduce(
    (acc, curr) => {
      const val = curr.valor || 0;
      acc.registrado += val;
      if (curr.situacao === 'Liquidado') acc.liquidado += val;
      else if (curr.situacao === 'Recepcionado') acc.recepcionado += val;
      else if (curr.situacao === 'Cancelado') acc.cancelado += val;
      else if (curr.situacao === 'Baixado') acc.baixado += val;
      return acc;
    },
    { registrado: 0, liquidado: 0, baixado: 0, recepcionado: 0, cancelado: 0 }
  );

  return (
    <div className="min-h-screen bg-[#EEEEF3] p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#280003]">Cobranças de Aluguéis</h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie os recebimentos, boletos e repasses</p>
        </div>

        <FinancialFilterBar />
        {loading ? (
          <div className="text-center py-12 text-[#280003] font-semibold">Carregando cobranças...</div>
        ) : (
          <>
            <FinancialSummary totals={totals} />
            <FinancialTable data={cobrancas} />
          </>
        )}
      </div>
    </div>
  );
}
