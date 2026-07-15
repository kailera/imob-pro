"use client";

import React from 'react';
import { DataTable, Column } from '@/components/shared/DataTable';

interface Cliente {
  nome: string;
  documento: string;
  telefone: string;
  perfil: 'Comprador' | 'Proprietário' | 'Inquilino' | 'Fiador';
}

const mockData: Cliente[] = [
  { nome: 'João da Silva', documento: '111.222.333-44', telefone: '(11) 98888-7777', perfil: 'Inquilino' },
  { nome: 'Maria Souza', documento: '555.666.777-88', telefone: '(11) 97777-6666', perfil: 'Proprietário' },
  { nome: 'Empresa XYZ Ltda', documento: '12.345.678/0001-90', telefone: '(11) 3333-4444', perfil: 'Comprador' },
  { nome: 'Carlos Mendes', documento: '999.888.777-66', telefone: '(11) 95555-4444', perfil: 'Fiador' },
  { nome: 'Ana Beatriz', documento: '222.333.444-55', telefone: '(11) 94444-3333', perfil: 'Inquilino' },
];

export default function ClientesPage() {
  const columns: Column<Cliente>[] = [
    { header: 'Nome', accessorKey: 'nome' },
    { header: 'CPF/CNPJ', accessorKey: 'documento' },
    { header: 'Telefone', accessorKey: 'telefone' },
    { 
      header: 'Perfil', 
      accessorKey: 'perfil',
      cell: (item: Cliente) => {
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#004777]/10 text-[#004777]">
            {item.perfil}
          </span>
        );
      }
    },
  ];

  return (
    <div className="p-6">
      <DataTable 
        title="Clientes" 
        data={mockData} 
        columns={columns} 
        onAddClick={() => console.log('Novo Cliente')}
      />
    </div>
  );
}
