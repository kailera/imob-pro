"use client";

import React from 'react';
import Link from 'next/link';
import { DataTable, Column } from '@/components/shared/DataTable';
import { adicionarDiasUTC } from '@/lib/locacao/periodos';

export interface Contrato {
    id?: string;
    code?: string;
    legacyCode?: string;
    recordType?: 'LEASE' | 'LEGACY';
    locatarios?: Array<{ nome?: string | null }>;
    imovel?: PropertyAddress & { imovelLocacaos?: Array<{ dataFim?: string | Date | null }> };
    imovelLocacao?: { dataFim?: string | Date | null } | null;
    vencimento?: string;
    status?: string;
    valorOriginal?: number;
    parcelasAtrasadas?: number;
}

interface ContratosTabContentProps {
    contratos: Contrato[];
}

type PropertyAddress = {
    logradouro?: string | null;
    descricao?: string | null;
    codigo?: string | null;
    numero?: number | null;
    complemento?: string | null;
    bairro?: string | null;
    cidade?: string | null;
    uf?: string | null;
    cep?: number | string | null;
}

function formatPropertyAddress(property: PropertyAddress) {
    if (!property) return 'Não informado';
    const street = property.logradouro?.trim() || property.descricao?.trim() || property.codigo || 'Endereço não informado';
    const number = property.numero ? `, ${property.numero}` : '';
    const complement = property.complemento ? `, ${property.complemento}` : '';
    const neighborhood = property.bairro ? ` — ${property.bairro}` : '';
    const cityState = [property.cidade, property.uf].filter(Boolean).join('/');
    const city = cityState ? `, ${cityState}` : '';
    const zipCode = property.cep
        ? `, CEP ${String(property.cep).replace(/\D/g, '').padStart(8, '0').replace(/(\d{5})(\d{3})/, '$1-$2')}`
        : '';
    return `${street}${number}${complement}${neighborhood}${city}${zipCode}`;
}

export default function ContratosTabContent({ contratos }: ContratosTabContentProps) {

    const getSearchText = (item: Contrato) => {
        const locacao = item.imovelLocacao || item.imovel?.imovelLocacaos?.[0];
        const status = item.recordType === 'LEASE'
            ? item.status === 'ACTIVE' ? 'Ativo'
                : item.status === 'TERMINATED' || item.status === 'CANCELLED' ? 'Encerrado'
                    : 'Pendente'
            : locacao?.dataFim && new Date(locacao.dataFim) < new Date() ? 'Encerrado' : 'Ativo';
        const property = item.imovel || {};

        return [
            item.id,
            item.code,
            item.legacyCode,
            item.locatarios?.map(locatario => locatario.nome).join(' '),
            property.codigo,
            property.logradouro,
            property.descricao,
            property.numero,
            property.complemento,
            property.bairro,
            property.cidade,
            property.uf,
            property.cep,
            status,
        ].filter(Boolean).join(' ');
    };

    // Definição das colunas adaptadas para o modelo Prisma Real
    const columns: Column<any>[] = [
        { 
            header: 'Contrato', 
            accessorKey: 'id',
            cell: (item: any) => (
                <Link
                    href={item.recordType === 'LEASE'
                        ? `/locacao/contratos/${item.id}/editar`
                        : `/locacao/view-locacao/${item.id}`}
                    className="text-[#004777] hover:text-[#002f50] font-bold hover:underline"
                >
                    {item.legacyCode || item.code || item.id}
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
                const desc = formatPropertyAddress(item.imovel);
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
                if (item.recordType === 'LEASE') {
                    if (!item.endDate) return 'Não informado';
                    return new Date(item.endDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
                }
                const locacao = item.imovelLocacao || item.imovel?.imovelLocacaos?.[0];
                if (!locacao?.dataFim) return 'Não informado';
                return new Date(locacao.dataFim).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
            }
        },
        {
            header: 'Próximo reajuste',
            accessorKey: 'proximoReajuste',
            cell: (item: any) => {
                if (item.recordType === 'LEASE') {
                    const ultimo = item.termsPeriods?.at(-1);
                    if (!ultimo?.effectiveTo || (item.endDate && new Date(ultimo.effectiveTo) > new Date(item.endDate))) return '—';
                    return new Date(ultimo.effectiveTo).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
                }
                const locacao = item.imovelLocacao || item.imovel?.imovelLocacaos?.[0];
                if (!locacao) return 'Não informado';
                const periodos = [...(locacao.periodos || [])].sort(
                    (a: any, b: any) => new Date(a.dataInicio).getTime() - new Date(b.dataInicio).getTime()
                );
                const ultimo = periodos[periodos.length - 1];
                const data = ultimo ? adicionarDiasUTC(ultimo.dataFim, 1) : locacao.proximoReajuste;
                if (!data || new Date(data) > new Date(locacao.dataFim)) return '—';
                return new Date(data).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
            }
        },
        {
            header: 'Histórico',
            accessorKey: 'historicoPeriodosStatus',
            cell: (item: any) => {
                const locacao = item.imovelLocacao || item.imovel?.imovelLocacaos?.[0];
                const status = item.recordType === 'LEASE'
                    ? item.termsPeriods?.length > 0 && item.termsPeriods.every((period: any) => period.reviewStatus === 'REVIEWED')
                        ? 'COMPLETO'
                        : item.termsPeriods?.length > 0 ? 'PARCIAL' : 'NAO_INICIADO'
                    : locacao?.historicoPeriodosStatus || 'NAO_INICIADO';
                const config: Record<string, { label: string; classe: string }> = {
                    COMPLETO: { label: 'Completo', classe: 'bg-emerald-50 text-emerald-700' },
                    PARCIAL: { label: 'Parcial', classe: 'bg-amber-50 text-amber-700' },
                    DIVERGENTE: { label: 'Divergente', classe: 'bg-rose-50 text-rose-700' },
                    NAO_INICIADO: { label: 'Não iniciado', classe: 'bg-gray-100 text-gray-600' },
                };
                const visual = config[status] || config.NAO_INICIADO;
                return <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${visual.classe}`}>{visual.label}</span>;
            }
        },
        {
            header: 'Status',
            accessorKey: 'status',
            cell: (item: any) => {
                // Determina um status com base no vencimento se não houver campo específico
                const locacao = item.imovelLocacao || item.imovel?.imovelLocacaos?.[0];
                let statusVal = item.recordType === 'LEASE'
                    ? item.status === 'ACTIVE' ? 'Ativo'
                        : item.status === 'TERMINATED' || item.status === 'CANCELLED' ? 'Encerrado'
                            : 'Pendente'
                    : 'Ativo';
                if (item.recordType !== 'LEASE' && locacao?.dataFim && new Date(locacao.dataFim) < new Date()) statusVal = 'Encerrado';
                
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
                        {item.recordType === 'LEASE' && (
                            <Link
                                href={`/locacao/view-locacao/${item.id}`}
                                className="inline-flex items-center gap-1 text-[#004777] hover:text-[#002f50] font-semibold text-xs hover:underline"
                            >
                                Visualizar
                            </Link>
                        )}
                        <Link
                            href={item.recordType === 'LEASE'
                                ? `/locacao/contratos/${item.id}/editar`
                                : `/locacao/view-locacao/${item.id}`}
                            className="inline-flex items-center gap-1 text-amber-600 hover:text-amber-800 font-semibold text-xs hover:underline"
                        >
                            {item.recordType === 'LEASE' ? 'Editar' : 'Visualizar legado'}
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
                searchText={getSearchText}
                searchPlaceholder="Buscar por contrato, inquilino, imóvel ou status..."
                responsiveCards
            />
        </div>
    );
}
