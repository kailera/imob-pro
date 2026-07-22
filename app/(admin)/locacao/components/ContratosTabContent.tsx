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

    // Definição das colunas adaptadas para o modelo Prisma Real
    const columns: Column<any>[] = [
        { 
            header: 'Contrato', 
            accessorKey: 'id',
            cell: (item: any) => (
                <Link
                    href={`/locacao/view-locacao/${item.id}`}
                    className="text-[#004777] hover:text-[#002f50] font-bold hover:underline"
                >
                    {item.id}
                </Link>
            )
        },
        { 
            header: 'Inquilino', 
            accessorKey: 'locatarios',
            cell: (item: any) => {
                const locatario = item.locatarios?.[0];
                return locatario ? locatario.nome : 'Não informado';
            }
        },
        { 
            header: 'Imóvel', 
            accessorKey: 'imovel',
            cell: (item: any) => {
                if (!item.imovel) return 'Não informado';
                const desc = item.imovel.descricao || item.imovel.codigo || 'Não informado';
                return (
                    <div className="max-w-[280px] truncate" title={desc}>
                        {desc}
                    </div>
                );
            }
        },
        { 
            header: 'Vencimento', 
            accessorKey: 'vencimento',
            cell: (item: any) => {
                // Tenta buscar da relação imovelLocacao direta (se inclusa) ou do imovel.imovelLocacaos
                const locacao = item.imovelLocacao || item.imovel?.imovelLocacaos?.[0];
                if (!locacao?.dataFim) return 'Não informado';
                return new Date(locacao.dataFim).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
            }
        },
        {
            header: 'Status',
            accessorKey: 'status',
            cell: (item: any) => {
                // Determina um status com base no vencimento se não houver campo específico
                const locacao = item.imovelLocacao || item.imovel?.imovelLocacaos?.[0];
                let statusVal = 'Ativo';
                if (locacao?.dataFim && new Date(locacao.dataFim) < new Date()) {
                    statusVal = 'Encerrado';
                }
                
                let bgClass = 'bg-gray-100 text-gray-700';
                if (statusVal === 'Ativo') bgClass = 'bg-[#708D81]/10 text-[#708D81]';
                else if (statusVal === 'Pendente') bgClass = 'bg-[#F0D18A]/35 text-[#8B7535]';
                else if (statusVal === 'Encerrado') bgClass = 'bg-gray-200 text-gray-500';

                return (
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${bgClass}`}>
                        {statusVal}
                    </span>
                );
            }
        },
        {
            header: 'Ações',
            accessorKey: 'id',
            cell: (item: any) => {
                return (
                    <div className="flex flex-wrap items-center justify-end gap-2 md:justify-start">
                        <Link
                            href={`/locacao/view-locacao/${item.id}`}
                            className="inline-flex items-center gap-1 text-[#004777] hover:text-[#002f50] font-semibold text-xs hover:underline"
                        >
                            Visualizar
                        </Link>
                        <span className="text-gray-300">|</span>
                        <Link
                            href={`/locacao/view-locacao/${item.id}?edit=true`}
                            className="inline-flex items-center gap-1 text-amber-600 hover:text-amber-800 font-semibold text-xs hover:underline"
                        >
                            Editar
                        </Link>
                    </div>
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
                responsiveCards
            />
        </div>
    );
}
