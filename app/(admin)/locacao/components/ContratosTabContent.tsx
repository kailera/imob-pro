"use client";

import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { DataTable, Column } from '@/components/shared/DataTable';

// Podemos exportar a interface para reuso, caso o pai precise dela
export interface Contrato {
    id?: string;
    contrato: string;
    inquilino: string;
    imovel: string;
    vencimento: string;
    status: 'Ativo' | 'Pendente' | 'Encerrado' | 'Atrasado' | 'Em Acordo';
    valorOriginal?: number;
    parcelasAtrasadas?: number;
}

interface ContratosTabContentProps {
    contratos: Contrato[];
    onOpenModal: () => void; // Passamos a função do botão via prop
}

export default function ContratosTabContent({ contratos, onOpenModal }: ContratosTabContentProps) {

    // Definição das colunas exatamente como estavam no seu arquivo gigante
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
                if (item.status === 'Ativo') bgClass = 'bg-[#708D81]/10 text-[#708D81]';
                else if (item.status === 'Pendente') bgClass = 'bg-[#F0D18A]/35 text-[#8B7535]';
                else if (item.status === 'Encerrado') bgClass = 'bg-gray-200 text-gray-500';
                else bgClass = 'bg-blue-100 text-blue-800';

                return (
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${bgClass}`}>
                        {item.status}
                    </span>
                );
            }
        },
        {
            header: 'Ações',
            accessorKey: 'id',
            cell: (item: Contrato) => {
                const targetId = item.id || item.contrato;
                return (
                    <Link
                        href={`/locacao/view-locacao/${targetId}`}
                        className="inline-flex items-center gap-1 text-[#004777] hover:text-[#002f50] font-bold text-xs hover:underline"
                    >
                        Visualizar <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                );
            }
        },
    ];

    return (
        <div className="animate-fade-in">
            <DataTable
                title="Contratos de Locação"
                data={contratos}
                columns={columns}
                onAddClick={onOpenModal} // O clique sobe para o LocacaoClientContainer abrir o modal!
            />
        </div>
    );
}