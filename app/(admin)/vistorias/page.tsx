"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Calendar,
  ChevronDown,
  Search,
  SlidersHorizontal,
  Loader2,
  X,
  Plus
} from "lucide-react";
import { KpiCard } from "@/components/vistorias/KpiCard";
import { ChartPlaceholder } from "@/components/vistorias/ChartPlaceholder";
import { VistoriaDetails, Vistoria } from "@/components/vistorias/VistoriaDetails";
import ConnectionStatus from "@/components/shared/ConnectionStatus";
import { getVistorias, getVistoriadores, createVistoria, getImoveisForVistoria } from "@/app/(admin)/vistorias/actions";
import { db } from "@/lib/db";
import PWAInstallPrompt from "@/components/shared/PWAInstallPrompt";

function mapDbVistoriaToUi(v: any): Vistoria {
  const statusLabels: Record<string, string> = {
    NAO_INICIADA: "Não iniciada",
    EM_ANDAMENTO: "Em andamento",
    AGUARDANDO_APROVACAO: "Aguardando aprovação",
    CONCLUIDA: "Concluída",
    CONTESTADA: "Contestada",
    CANCELADA: "Cancelada",
  };

  const tipoLabels: Record<string, "Entrada" | "Saída" | "Periódica"> = {
    ENTRADA: "Entrada",
    SAIDA: "Saída",
    PERIODICA: "Periódica",
  };

  const tipo = tipoLabels[v.tipo] || "Entrada";
  const status = (v.status ? v.status.toLowerCase() : "nao_iniciada") as any;

  return {
    id: v.id,
    codigo: v.codigo,
    tipo,
    status,
    statusLabel: statusLabels[v.status] || "Não iniciada",
    solicitadaPor: v.operador ? `${v.operador.firstName} ${v.operador.lastName}` : "Sistema",
    dataSolicitacao: new Date(v.data).toLocaleDateString("pt-BR"),
    dataVistoria: new Date(v.data).toLocaleDateString("pt-BR"),
    vistoriador: v.vistoriador ? `${v.vistoriador.firstName} ${v.vistoriador.lastName}${v.vistoriador.creci ? ` (CRECI: ${v.vistoriador.creci})` : ''}` : "Não designado",
    imovelCodigo: v.imovel ? v.imovel.codigo : "",
    endereco: v.imovel ? `${v.imovel.bairro}, ${v.imovel.cidade}/${v.imovel.uf}` : "",
    proprietario: v.proprietario || "Não informado",
    inquilino: "Não vinculado",
    tipoImovel: v.imovel ? (v.imovel.tipo === "CASA" ? "Casa" : "Apartamento") : "Outro",
  };
}

const periods = ["Junho 2026", "Maio 2026", "Abril 2026", "Todo o período"];

export default function VistoriasPage() {
  const router = useRouter();
  const [vistorias, setVistorias] = useState<Vistoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("Junho 2026");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVistoria, setSelectedVistoria] = useState<Vistoria | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("todos");

  // Modal para Criar Nova Vistoria
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [imoveis, setImoveis] = useState<any[]>([]);
  const [vistoriadores, setVistoriadores] = useState<any[]>([]);
  const [selectedImovelId, setSelectedImovelId] = useState("");
  const [imovelSearchTerm, setImovelSearchTerm] = useState("");
  const [isImovelDropdownOpen, setIsImovelDropdownOpen] = useState(false);
  const [selectedVistoriadorId, setSelectedVistoriadorId] = useState("");
  const [newTipo, setNewTipo] = useState<"ENTRADA" | "SAIDA" | "PERIODICA">("ENTRADA");
  const [newTipoImovel, setNewTipoImovel] = useState<"CASA" | "APARTAMENTO">("APARTAMENTO");
  const [newData, setNewData] = useState("");
  const [newProprietario, setNewProprietario] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [creationError, setCreationError] = useState("");

  const loadData = async () => {
    setLoading(true);
    let mapped: Vistoria[] = [];

    try {
      if (navigator.onLine) {
        const res = await getVistorias();
        if (res.success && res.data) {
          // Salva todas no cache local
          for (const v of res.data) {
            await db.vistorias.put({
              id: v.id,
              codigo: v.codigo,
              tipo: v.tipo,
              status: v.status,
              data: v.data instanceof Date ? v.data.toISOString() : String(v.data),
              proprietario: v.proprietario || "Não informado",
              endereco: v.imovel ? `${v.imovel.bairro}, ${v.imovel.cidade}/${v.imovel.uf}` : "",
              observacoes: (v as any).observacoes || "",
              reparosNecessarios: (v as any).reparosNecessarios || "",
              chavesQuantidade: (v as any).chavesQuantidade || 0,
              chavesObservacao: (v as any).chavesObservacao || "",
              ambienteVistorias: (v as any).ambienteVistorias || [],
              comentariosVistoria: (v as any).comentariosVistoria || [],
              infoGeral: (v as any).infoGeral || []
            });
          }
          mapped = res.data.map(mapDbVistoriaToUi);
        }
      }
    } catch (e) {
      console.error("Erro ao carregar dados da rede, usando IndexedDB:", e);
    }

    if (mapped.length === 0) {
      // Offline fallback
      try {
        const cached = await db.vistorias.toArray();
        mapped = cached.map(v => ({
          id: v.id,
          codigo: v.codigo,
          tipo: v.tipo as any,
          status: v.status.toLowerCase() as any,
          statusLabel: v.status === "NAO_INICIADA" ? "Não iniciada" : v.status === "EM_ANDAMENTO" ? "Em andamento" : v.status === "CONCLUIDA" ? "Concluída" : v.status,
          solicitadaPor: "Sistema (Offline)",
          dataSolicitacao: new Date(v.data).toLocaleDateString("pt-BR"),
          dataVistoria: new Date(v.data).toLocaleDateString("pt-BR"),
          vistoriador: "Vistoriador Responsável",
          imovelCodigo: v.codigo,
          endereco: v.endereco,
          proprietario: v.proprietario,
          inquilino: "Não vinculado",
          tipoImovel: "Outro"
        }));
      } catch (err) {
        console.error("Erro ao carregar cache do IndexedDB:", err);
      }
    }

    setVistorias(mapped);
    if (mapped.length > 0) {
      setSelectedVistoria(mapped[0]);
    } else {
      setSelectedVistoria(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = async () => {
    setCreationError("");
    setIsCreateModalOpen(true);
    setImovelSearchTerm("");
    setIsImovelDropdownOpen(false);
    
    console.log("Modal de criação aberto. Buscando dados...");

    // Tenta buscar Imóveis
    try {
      const resImoveis = await getImoveisForVistoria();
      console.log("Imóveis retornados:", resImoveis);
      if (resImoveis.success && resImoveis.data) {
        setImoveis(resImoveis.data);
        const firstImovel = resImoveis.data[0];
        if (firstImovel) {
          setSelectedImovelId(firstImovel.id);
          const fullAddress = `${firstImovel.codigo} - ${firstImovel.bairro || ""}, ${firstImovel.cidade || ""} (Nº ${firstImovel.numero || ""})`;
          setImovelSearchTerm(fullAddress);
          const ownerName = firstImovel.imovelLocacaos?.[0]?.locadors?.[0]?.nome || "";
          setNewProprietario(ownerName);
        }
      }
    } catch (e) {
      console.warn("Erro ao carregar imóveis online, tentando carregar do cache local:", e);
    }

    // Tenta buscar Vistoriadores
    try {
      const resVistoriadores = await getVistoriadores();
      console.log("Vistoriadores retornados:", resVistoriadores);
      if (resVistoriadores.success && resVistoriadores.data && resVistoriadores.data.length > 0) {
        setVistoriadores(resVistoriadores.data);
        setSelectedVistoriadorId(resVistoriadores.data[0].id);
      } else {
        throw new Error(resVistoriadores.error || "Nenhum vistoriador encontrado.");
      }
    } catch (e) {
      console.warn("Erro ao buscar vistoriadores online, usando fallback do cache local:", e);
      try {
        const cached = await db.vistorias.toArray();
        const uniqueVistoriadoresMap = new Map();
        
        cached.forEach(v => {
          if ((v as any).vistoriadorId && (v as any).vistoriadorName) {
            uniqueVistoriadoresMap.set((v as any).vistoriadorId, {
              id: (v as any).vistoriadorId,
              firstName: (v as any).vistoriadorName.split(' ')[0] || "Vistoriador",
              lastName: (v as any).vistoriadorName.split(' ').slice(1).join(' ') || ""
            });
          }
        });
        
        const offlineVistoriadores = Array.from(uniqueVistoriadoresMap.values());
        console.log("Vistoriadores offline encontrados:", offlineVistoriadores);
        if (offlineVistoriadores.length > 0) {
          setVistoriadores(offlineVistoriadores);
          setSelectedVistoriadorId(offlineVistoriadores[0].id);
        }
      } catch (err) {
        console.error("Erro no fallback de vistoriadores offline:", err);
      }
    }
    
    // Set default date to today
    const today = new Date().toISOString().split("T")[0];
    setNewData(today);
  };

  const handleCreateVistoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedImovelId || !selectedVistoriadorId || !newData) {
      setCreationError("Preencha todos os campos obrigatórios.");
      return;
    }
    setIsCreating(true);
    setCreationError("");

    const payload = {
      imovelId: selectedImovelId,
      operadorId: "", // Resolvido dinamicamente na Server Action via Clerk auth()
      vistoriadorId: selectedVistoriadorId,
      tipo: newTipo,
      data: new Date(newData),
      tipoImovelVistoriado: newTipoImovel,
      proprietario: newProprietario || "Não informado",
      ambientesPadrao: ["Fachada", "Sala de Estar", "Cozinha", "Banheiro", "Quarto principal"],
    };

    if (navigator.onLine) {
      const res = await createVistoria(payload);
      setIsCreating(false);
      if (res.success && res.data) {
        setIsCreateModalOpen(false);
        // Redireciona diretamente para a ficha recém-criada
        router.push(`/vistorias/ficha-vistoria/${res.data.id}`);
      } else {
        setCreationError(res.error || "Erro ao criar vistoria.");
      }
    } else {
      // Offline Flow
      setIsCreating(false);
      const tempId = "temp-" + Date.now();
      const tempCodigo = "VIS-OFFLINE-" + Date.now().toString().slice(-4);
      
      const selectedIm = imoveis.find(im => im.id === selectedImovelId);

      const newOfflineVistoria = {
        id: tempId,
        codigo: tempCodigo,
        tipo: newTipo,
        status: "NAO_INICIADA",
        data: new Date(newData).toISOString(),
        proprietario: newProprietario || "Não informado",
        endereco: selectedIm ? `${selectedIm.bairro || ""}, ${selectedIm.cidade || ""}/${selectedIm.uf || ""}` : "Endereço Local",
        observacoes: "",
        reparosNecessarios: "",
        chavesQuantidade: 0,
        chavesObservacao: "",
        ambienteVistorias: ["Fachada", "Sala de Estar", "Cozinha", "Banheiro", "Quarto principal"].map((nome, index) => ({
          id: "temp-room-" + index + "-" + Date.now(),
          nome,
          tipo: nome,
          ordem: index,
          visaoGeral: "",
          comentarios: ""
        })),
        comentariosVistoria: [],
        infoGeral: [],
        pendingCreate: true
      };

      try {
        await db.vistorias.put(newOfflineVistoria);
        
        await db.syncQueue.put({
          type: "CREATE_VISTORIA",
          vistoriaId: tempId,
          payload,
          timestamp: Date.now()
        });

        setIsCreateModalOpen(false);
        alert("Vistoria criada localmente (offline)! Entrando na ficha...");
        router.push(`/vistorias/ficha-vistoria/${tempId}`);
      } catch (err: any) {
        setCreationError(err.message || "Erro ao criar vistoria offline.");
      }
    }
  };

  // Filter vistorias based on search term & status
  const filteredVistorias = vistorias.filter((v) => {
    const matchesSearch =
      v.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.endereco.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.inquilino.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.vistoriador.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "todos" || v.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Filter imoveis based on search input (by code or address)
  const filteredImoveis = imoveis.filter((im) => {
    const searchString = `${im.codigo} ${im.bairro || ""} ${im.cidade || ""} ${im.uf || ""} ${im.numero || ""}`.toLowerCase();
    return searchString.includes(imovelSearchTerm.toLowerCase());
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

  // KPIs dinâmicos baseados nas vistorias do banco
  const kpis = {
    nao_iniciada: vistorias.filter(v => v.status === "nao_iniciada").length,
    em_andamento: vistorias.filter(v => v.status === "em_andamento").length,
    aguardando_aprovacao: vistorias.filter(v => v.status === "aguardando_aprovacao").length,
    concluida: vistorias.filter(v => v.status === "concluida").length,
    contestada: vistorias.filter(v => v.status === "contestada").length,
  };

  const naoConcluidasData = {
    naoIniciada: kpis.nao_iniciada,
    emAndamento: kpis.em_andamento,
    aguardandoAprovacao: kpis.aguardando_aprovacao,
  };

  // Agrupar concluídas por vistoriador
  const completedBySurveyorMap: Record<string, number> = {};
  vistorias.forEach((v) => {
    if (v.status === "concluida" && v.vistoriador) {
      // Limpa nome removendo CRECI
      const name = v.vistoriador.split(" (CRECI:")[0];
      completedBySurveyorMap[name] = (completedBySurveyorMap[name] || 0) + 1;
    }
  });

  const porVistoriadorData = Object.entries(completedBySurveyorMap)
    .map(([nome, concluidas]) => ({ nome, concluidas }))
    .sort((a, b) => b.concluidas - a.concluidas);

  // Calcular vistorias por semana do mês atual
  const getVistoriasByWeek = () => {
    const weeks = [0, 0, 0, 0];
    vistorias.forEach((v) => {
      if (!v.dataVistoria) return;
      const parts = v.dataVistoria.split("/");
      if (parts.length !== 3) return;
      const day = parseInt(parts[0], 10);
      if (day <= 7) weeks[0]++;
      else if (day <= 14) weeks[1]++;
      else if (day <= 21) weeks[2]++;
      else weeks[3]++;
    });
    return weeks;
  };

  const porPeriodoData = getVistoriasByWeek();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#004777]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 w-full bg-white max-w-7xl mx-auto pb-16 relative">
      {/* Dynamic SEO tags simulated through semantic header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 id="page-title" className="text-3xl font-extrabold text-[#280003] tracking-tight">
              Vistorias
            </h1>
            <div className="print:hidden">
              <ConnectionStatus />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Gerencie e acompanhe o andamento dos laudos de vistorias residenciais e comerciais no banco de dados.
          </p>
        </div>

        <div className="flex align-middle self-start md:self-center">
          <button
            onClick={openCreateModal}
            className="print:hidden px-5 py-2.5 bg-[#004777] text-white rounded-xl text-sm font-semibold hover:bg-[#00365a] transition-all shadow-sm duration-200 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nova Vistoria
          </button>
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
        <KpiCard title="Não iniciada" value={kpis.nao_iniciada} icon={FileText} status="nao_iniciada" />
        <KpiCard title="Em andamento" value={kpis.em_andamento} icon={Clock} status="em_andamento" />
        <KpiCard title="Aguardando aprovação" value={kpis.aguardando_aprovacao} icon={Eye} status="aguardando_aprovacao" />
        <KpiCard title="Concluída" value={kpis.concluida} icon={CheckCircle2} status="concluida" />
        <KpiCard title="Contestada" value={kpis.contestada} icon={AlertTriangle} status="contestada" />
      </section>

      {/* Charts Grid */}
      <section className="hidden md:grid grid-cols-1 md:grid-cols-3 gap-6" aria-labelledby="charts-heading">
        <h2 id="charts-heading" className="sr-only">Gráficos de Acompanhamento</h2>
        <ChartPlaceholder
          type="nao_concluidas"
          title="Vistorias Não Concluídas"
          naoConcluidasData={naoConcluidasData}
        />
        <ChartPlaceholder
          type="por_vistoriador"
          title="Vistorias Concluídas por Vistoriador"
          porVistoriadorData={porVistoriadorData}
        />
        <ChartPlaceholder
          type="por_periodo"
          title="Desempenho Geral / Histórico"
          porPeriodoData={porPeriodoData}
        />
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
                  onClick={() => {
                    if (window.innerWidth < 1024) {
                      router.push(`/vistorias/ficha-vistoria/${v.id}`);
                    } else {
                      setSelectedVistoria(v);
                    }
                  }}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 gap-3 cursor-pointer hover:bg-slate-50/70 transition-all ${getStatusRowClass(
                    v.status
                  )} ${selectedVistoria && selectedVistoria.id === v.id ? "bg-[#004777]/5 border-l-4" : ""}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-bold text-[#004777]">{v.codigo}</span>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                        {v.tipo}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-[#280003] truncate">{v.proprietario}</h4>
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
        <section className="hidden lg:flex bg-transparent flex-col gap-6" aria-labelledby="details-heading">
          <h2 id="details-heading" className="sr-only">Painel de Detalhes</h2>
          {selectedVistoria ? (
            <VistoriaDetails
              vistoria={selectedVistoria}
              onViewFullReport={(id) => {
                router.push(`/vistorias/ficha-vistoria/${id}`);
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

      {/* MODAL DE CRIAÇÃO PREMIUM */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-[#EEEEF3] flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-[#004777] p-5 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                <h3 className="font-bold text-base">Nova Vistoria Técnica</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateVistoria} className="p-6 flex flex-col gap-4 overflow-y-auto">
              {creationError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{creationError}</span>
                </div>
              )}

              {/* Imovel */}
              <div className="flex flex-col gap-1 relative">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Imóvel *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Pesquise por código ou endereço..."
                    value={imovelSearchTerm}
                    onChange={(e) => {
                      setImovelSearchTerm(e.target.value);
                      setIsImovelDropdownOpen(true);
                    }}
                    onFocus={() => setIsImovelDropdownOpen(true)}
                    className="w-full px-3 py-2.5 border border-[#EEEEF3] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#004777]/20"
                    required
                  />
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                
                {isImovelDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setIsImovelDropdownOpen(false)} 
                    />
                    <ul className="absolute left-0 right-0 top-full mt-1 max-h-60 overflow-y-auto bg-white border border-[#EEEEF3] rounded-lg shadow-lg z-20 py-1">
                      {filteredImoveis.length === 0 ? (
                        <li className="px-3 py-2 text-xs text-gray-400">Nenhum imóvel encontrado</li>
                      ) : (
                        filteredImoveis.map((im) => (
                          <li
                            key={im.id}
                            onClick={() => {
                              setSelectedImovelId(im.id);
                              setImovelSearchTerm(`${im.codigo} - ${im.bairro || ""}, ${im.cidade || ""} (Nº ${im.numero || ""})`);
                              setIsImovelDropdownOpen(false);
                              const ownerName = im.imovelLocacaos?.[0]?.locadors?.[0]?.nome || "";
                              setNewProprietario(ownerName);
                            }}
                            className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 transition-colors ${
                              selectedImovelId === im.id ? "bg-[#004777]/5 font-semibold text-[#004777]" : "text-gray-700"
                            }`}
                          >
                            <span className="font-bold">{im.codigo}</span> - {im.bairro}, {im.cidade} (Nº {im.numero})
                          </li>
                        ))
                      )}
                    </ul>
                  </>
                )}
              </div>

              {/* Vistoriador */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Vistoriador Designado *
                </label>
                <select
                  value={selectedVistoriadorId}
                  onChange={(e) => setSelectedVistoriadorId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-[#EEEEF3] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#004777]/20"
                  required
                >
                  <option value="" disabled>Selecione um vistoriador...</option>
                  {vistoriadores.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.firstName} {v.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Tipo de Vistoria */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Tipo de Vistoria
                  </label>
                  <select
                    value={newTipo}
                    onChange={(e) => setNewTipo(e.target.value as any)}
                    className="w-full px-3 py-2.5 border border-[#EEEEF3] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#004777]/20"
                  >
                    <option value="ENTRADA">Entrada</option>
                    <option value="SAIDA">Saída</option>
                    <option value="PERIODICA">Periódica</option>
                  </select>
                </div>

                {/* Tipo de Imovel */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Tipo do Imóvel
                  </label>
                  <select
                    value={newTipoImovel}
                    onChange={(e) => setNewTipoImovel(e.target.value as any)}
                    className="w-full px-3 py-2.5 border border-[#EEEEF3] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#004777]/20"
                  >
                    <option value="APARTAMENTO">Apartamento</option>
                    <option value="CASA">Casa</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Data */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Data da Vistoria *
                  </label>
                  <input
                    type="date"
                    value={newData}
                    onChange={(e) => setNewData(e.target.value)}
                    className="w-full px-3 py-2.5 border border-[#EEEEF3] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#004777]/20"
                    required
                  />
                </div>

                {/* Proprietário */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Proprietário
                  </label>
                  <input
                    type="text"
                    placeholder="Nome do proprietário..."
                    value={newProprietario}
                    onChange={(e) => setNewProprietario(e.target.value)}
                    className="w-full px-3 py-2.5 border border-[#EEEEF3] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#004777]/20"
                  />
                </div>
              </div>

              {/* Info text */}
              <div className="text-xs text-gray-500 leading-relaxed bg-[#004777]/5 p-3 rounded-lg border border-[#004777]/10 mt-1">
                Ao criar a vistoria, o sistema gerará automaticamente os ambientes padrões de inspeção (Fachada, Sala de Estar, Cozinha, Banheiro, Quarto principal).
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-[#EEEEF3]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-[#EEEEF3] rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2.5 bg-[#004777] text-white rounded-lg text-sm font-semibold hover:bg-[#00365a] transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Criando...</span>
                    </>
                  ) : (
                    <span>Criar Vistoria</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <PWAInstallPrompt />
    </div>
  );
}
