"use client";

import React, { useState } from "react";
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Calendar,
  ChevronDown,
  Search,
  Filter,
  SlidersHorizontal,
  Home
} from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import { ChartPlaceholder } from "@/components/ChartPlaceholder";
import { VistoriaDetails, Vistoria } from "@/components/VistoriaDetails";

// Realistic mock data matching the requested KPI totals:
// 12 Não iniciadas, 5 Em andamento, 2 Aguardando aprovação, 28 Concluídas, 3 Contestadas
const mockVistorias: Vistoria[] = [
  {
    id: "1",
    codigo: "VIS-2026-104",
    tipo: "Entrada",
    status: "nao_iniciada",
    statusLabel: "Não iniciada",
    solicitadaPor: "Imob Pro Locação",
    dataSolicitacao: "18/06/2026",
    dataVistoria: "25/06/2026",
    vistoriador: "Rodrigo Silva",
    imovelCodigo: "IMOB-9041",
    tipoImovel: "Apartamento",
    proprietario: "Carlos Eduardo Santos",
    inquilino: "Juliana Vieira Ramos",
    endereco: "Av. Paulista, 1200 - Apto 84 - Bela Vista, São Paulo/SP"
  },
  {
    id: "2",
    codigo: "VIS-2026-101",
    tipo: "Saída",
    status: "em_andamento",
    statusLabel: "Em andamento",
    solicitadaPor: "Imob Pro Vendas",
    dataSolicitacao: "15/06/2026",
    dataVistoria: "22/06/2026",
    vistoriador: "Mariana Costa",
    imovelCodigo: "IMOB-4402",
    tipoImovel: "Casa Residencial",
    proprietario: "Roberto Farias Neto",
    inquilino: "Guilherme de Souza",
    endereco: "Rua das Palmeiras, 450 - Jardim América, São Paulo/SP"
  },
  {
    id: "3",
    codigo: "VIS-2026-098",
    tipo: "Periódica",
    status: "aguardando_aprovacao",
    statusLabel: "Aguardando aprovação",
    solicitadaPor: "Administração",
    dataSolicitacao: "12/06/2026",
    dataVistoria: "20/06/2026",
    vistoriador: "Gabriel Santos",
    imovelCodigo: "IMOB-7719",
    tipoImovel: "Conjunto Comercial",
    proprietario: "Fernanda Albuquerque",
    inquilino: "Tech Solutions Corp",
    endereco: "Av. Faria Lima, 2000 - Andar 12 - Itaim Bibi, São Paulo/SP"
  },
  {
    id: "4",
    codigo: "VIS-2026-088",
    tipo: "Entrada",
    status: "concluida",
    statusLabel: "Concluída",
    solicitadaPor: "Imob Pro Locação",
    dataSolicitacao: "05/06/2026",
    dataVistoria: "10/06/2026",
    vistoriador: "Rodrigo Silva",
    imovelCodigo: "IMOB-1123",
    tipoImovel: "Studio",
    proprietario: "Patrícia Lima",
    inquilino: "Lucas Medeiros",
    endereco: "Rua Augusta, 1500 - Apto 302 - Consolação, São Paulo/SP"
  },
  {
    id: "5",
    codigo: "VIS-2026-074",
    tipo: "Saída",
    status: "contestada",
    statusLabel: "Contestada",
    solicitadaPor: "Inquilino",
    dataSolicitacao: "28/05/2026",
    dataVistoria: "02/06/2026",
    vistoriador: "Mariana Costa",
    imovelCodigo: "IMOB-3388",
    tipoImovel: "Cobertura",
    proprietario: "Eduardo Silveira",
    inquilino: "Marina Barbosa Mendes",
    endereco: "Al. Lorena, 890 - Cobertura B - Cerqueira César, São Paulo/SP"
  },
  {
    id: "6",
    codigo: "VIS-2026-105",
    tipo: "Entrada",
    status: "nao_iniciada",
    statusLabel: "Não iniciada",
    solicitadaPor: "Imob Pro Locação",
    dataSolicitacao: "20/06/2026",
    dataVistoria: "27/06/2026",
    vistoriador: "Gabriel Santos",
    imovelCodigo: "IMOB-8092",
    tipoImovel: "Apartamento",
    proprietario: "Beatriz Oliveira",
    inquilino: "Pedro Henrique Rezende",
    endereco: "Rua Bela Cintra, 2300 - Apto 101 - Consolação, São Paulo/SP"
  },
  {
    id: "7",
    codigo: "VIS-2026-092",
    tipo: "Periódica",
    status: "concluida",
    statusLabel: "Concluída",
    solicitadaPor: "Administração",
    dataSolicitacao: "02/06/2026",
    dataVistoria: "08/06/2026",
    vistoriador: "Rodrigo Silva",
    imovelCodigo: "IMOB-5561",
    tipoImovel: "Casa Residencial",
    proprietario: "Amilton Cesar",
    inquilino: "Claudio Pinheiro",
    endereco: "Av. Rebouças, 3100 - Pinheiros, São Paulo/SP"
  }
];

const periods = ["Junho 2026", "Maio 2026", "Abril 2026", "Todo o período"];

export default function VistoriasPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("Junho 2026");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVistoria, setSelectedVistoria] = useState<Vistoria>(mockVistorias[0]);
  const [statusFilter, setStatusFilter] = useState<string>("todos");

  // Filter vistorias based on search term & status
  const filteredVistorias = mockVistorias.filter((v) => {
    const matchesSearch =
      v.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.endereco.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.inquilino.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.vistoriador.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "todos" || v.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusRowClass = (status: string) => {
    switch (status) {
      case "nao_iniciada":
        return "border-l-4 border-l-slate-400";
      case "em_andamento":
        return "border-l-4 border-l-[#F0D18A]";
      case "aguardando_aprovacao":
        return "border-l-4 border-l-[#004777]";
      case "concluida":
        return "border-l-4 border-l-[#708D81]";
      case "contestada":
        return "border-l-4 border-l-red-500";
      default:
        return "";
    }
  };

  const getStatusBadgeMiniClass = (status: string) => {
    switch (status) {
      case "nao_iniciada":
        return "bg-slate-100 text-slate-700";
      case "em_andamento":
        return "bg-[#F0D18A]/20 text-[#8c6d1f]";
      case "aguardando_aprovacao":
        return "bg-[#004777]/10 text-[#004777]";
      case "concluida":
        return "bg-[#708D81]/15 text-[#708D81]";
      case "contestada":
        return "bg-red-50 text-red-700";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="flex flex-col gap-8 w-full bg-white max-w-7xl mx-auto pb-16">
      {/* Dynamic SEO tags simulated through semantic header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 id="page-title" className="text-3xl font-extrabold text-[#280003] tracking-tight">
            Vistorias
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gerencie e acompanhe o andamento dos laudos de vistorias residenciais e comerciais.
          </p>
        </div>

        {/* Minimal Dropdown Month Filter */}
        <div className="relative align-middle self-start md:self-center">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            id="period-filter-btn"
            className="flex items-center gap-2 px-4 py-2 bg-white border border-[#EEEEF3] rounded-xl text-sm font-semibold text-[#280003] shadow-sm hover:bg-slate-50 hover:shadow transition-all"
          >
            <Calendar className="w-4 h-4 text-[#004777]" />
            <span>Filtro: {selectedPeriod}</span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {isDropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />
              <div className="absolute right-0 mt-2 w-48 bg-white border border-[#EEEEF3] rounded-xl shadow-lg z-20 py-1.5 overflow-hidden animate-in fade-in-50 slide-in-from-top-2 duration-200">
                {periods.map((period) => (
                  <button
                    key={period}
                    onClick={() => {
                      setSelectedPeriod(period);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors hover:bg-gray-50 font-medium ${selectedPeriod === period ? "text-[#004777] bg-[#004777]/5 font-semibold" : "text-[#280003]/80"
                      }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </header>

      {/* KPI Section */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" aria-labelledby="kpis-heading">
        <h2 id="kpis-heading" className="sr-only">Indicadores de Desempenho</h2>
        <KpiCard title="Não iniciada" value={12} icon={FileText} status="nao_iniciada" />
        <KpiCard title="Em andamento" value={5} icon={Clock} status="em_andamento" />
        <KpiCard title="Aguardando aprovação" value={2} icon={Eye} status="aguardando_aprovacao" />
        <KpiCard title="Concluída" value={28} icon={CheckCircle2} status="concluida" />
        <KpiCard title="Contestada" value={3} icon={AlertTriangle} status="contestada" />
      </section>

      {/* Charts Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6" aria-labelledby="charts-heading">
        <h2 id="charts-heading" className="sr-only">Gráficos de Acompanhamento</h2>
        <ChartPlaceholder type="nao_concluidas" title="Vistorias Não Concluídas" />
        <ChartPlaceholder type="por_vistoriador" title="Vistorias Concluídas por Vistoriador" />
        <ChartPlaceholder type="por_periodo" title="Desempenho Geral / Histórico" />
      </section>

      {/* Master-Detail Interactive System */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left/Middle Column: List of Inspections */}
        <section className="lg:col-span-2 bg-white rounded-2xl border border-[#EEEEF3] shadow-sm overflow-hidden flex flex-col h-[600px]">
          {/* List Toolbar */}
          <div className="p-4 sm:p-5 border-b border-[#EEEEF3] flex flex-col sm:flex-row items-center justify-between gap-4 bg-white">
            <h3 className="text-base font-bold text-[#280003] self-start sm:self-center">
              Vistorias Recentes
            </h3>

            <div className="flex w-full sm:w-auto items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Pesquisar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-60 pl-9 pr-4 py-1.5 bg-[#EEEEF3]/60 border-none rounded-lg text-sm text-[#280003] placeholder-[#280003]/40 focus:outline-none focus:ring-2 focus:ring-[#004777]/20 transition-all"
                  id="inspection-search-input"
                />
              </div>

              {/* Status Filter */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="appearance-none bg-[#EEEEF3]/60 text-xs font-semibold py-2 pl-3 pr-8 rounded-lg text-[#280003] focus:outline-none focus:ring-2 focus:ring-[#004777]/20 cursor-pointer"
                  id="status-filter-select"
                >
                  <option value="todos">Status: Todos</option>
                  <option value="nao_iniciada">Não Iniciada</option>
                  <option value="em_andamento">Em Andamento</option>
                  <option value="aguardando_aprovacao">Aguard. Aprov.</option>
                  <option value="concluida">Concluída</option>
                  <option value="contestada">Contestada</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                  <ChevronDown className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </div>

          {/* List Body */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#EEEEF3]">
            {filteredVistorias.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
                <SlidersHorizontal className="w-8 h-8 mb-2 stroke-1" />
                <p className="text-sm font-medium">Nenhuma vistoria encontrada.</p>
              </div>
            ) : (
              filteredVistorias.map((v) => (
                <div
                  key={v.id}
                  onClick={() => setSelectedVistoria(v)}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 gap-3 cursor-pointer hover:bg-slate-50/70 transition-all ${getStatusRowClass(
                    v.status
                  )} ${selectedVistoria.id === v.id ? "bg-[#004777]/5 border-l-4" : ""}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-bold text-[#004777]">{v.codigo}</span>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                        {v.tipo}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-[#280003] truncate">{v.inquilino}</h4>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{v.endereco}</p>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 flex-shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusBadgeMiniClass(v.status)}`}>
                      {v.statusLabel}
                    </span>
                    <span className="text-[11px] text-gray-400 font-medium">
                      {v.dataVistoria ? `Vistoria: ${v.dataVistoria}` : `Solicitada: ${v.dataSolicitacao}`}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Right Column: Detailed View */}
        <section className="bg-transparent flex flex-col gap-6" aria-labelledby="details-heading">
          <h2 id="details-heading" className="sr-only">Painel de Detalhes</h2>
          {selectedVistoria ? (
            <VistoriaDetails
              vistoria={selectedVistoria}
              onViewFullReport={(id) => {
                // Navega para a página detalhada da ficha de vistoria
                window.location.href = `/vistorias/ficha-vistoria/${id}`;
              }}
            />
          ) : (
            <div className="bg-white rounded-2xl border border-[#EEEEF3] p-8 text-center text-gray-400 shadow-sm flex flex-col items-center justify-center h-[300px]">
              <FileText className="w-10 h-10 mb-3 stroke-1 text-gray-300" />
              <p className="text-sm font-medium">Selecione uma vistoria na lista para visualizar seus detalhes completos.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
