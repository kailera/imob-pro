"use client";

import React from 'react';
import { DataTable, Column } from '@/components/DataTable';

interface Contrato {
  contrato: string;
  inquilino: string;
  imovel: string;
  vencimento: string;
  status: 'Ativo' | 'Pendente' | 'Encerrado';
}

const mockData: Contrato[] = [
  { contrato: 'LOC-2023-001', inquilino: 'João da Silva', imovel: 'IMB-001 - Apto Centro', vencimento: '10/11/2024', status: 'Ativo' },
  { contrato: 'LOC-2023-002', inquilino: 'Maria Souza', imovel: 'IMB-005 - Sobrado', vencimento: '15/12/2024', status: 'Ativo' },
  { contrato: 'LOC-2024-001', inquilino: 'Carlos Mendes', imovel: 'IMB-002 - Casa Cond.', vencimento: '05/01/2025', status: 'Pendente' },
  { contrato: 'LOC-2022-045', inquilino: 'Ana Beatriz', imovel: 'IMB-004 - Kitnet', vencimento: '01/08/2023', status: 'Encerrado' },
  { contrato: 'LOC-2024-005', inquilino: 'Roberto Justos', imovel: 'IMB-003 - Cobertura', vencimento: '20/02/2025', status: 'Ativo' },
];

export default function LocacaoPage() {
  const columns: Column<Contrato>[] = [
    { header: 'Contrato', accessorKey: 'contrato' },
    { header: 'Inquilino', accessorKey: 'inquilino' },
    { header: 'Imóvel', accessorKey: 'imovel' },
    { header: 'Vencimento', accessorKey: 'vencimento' },
    { 
      header: 'Status', 
      accessorKey: 'status',
      cell: (item: Contrato) => {
        let bgClass = 'bg-gray-100 text-gray-700';
        
        if (item.status === 'Ativo') {
          bgClass = 'bg-[#708D81]/10 text-[#708D81]';
        } else if (item.status === 'Pendente') {
          bgClass = 'bg-[#F0D18A]/30 text-[#8B7535]';
        }

        return (
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${bgClass}`}>
            {item.status}
          </span>
        );
      }
    },
  ];

  return (
    <div className="p-6">
      <DataTable 
        title="Contratos de Locação" 
        data={mockData} 
        columns={columns} 
        onAddClick={() => console.log('Novo Contrato')}
      />
    </div>
  );
}
