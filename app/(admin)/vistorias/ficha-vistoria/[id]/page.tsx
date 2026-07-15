"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Edit3, Map, Grid2X2, Save, FileText, Loader2, Share2, Copy, Check } from "lucide-react";
import { RoomBuilderForm } from "@/components/vistorias/ficha-vistoria/RoomBuilderForm";
import { FloorPlanVisualizer, Room, RoomType } from "@/components/vistorias/ficha-vistoria/FloorPlanVisualizer";
import { DetailSections } from "@/components/vistorias/ficha-vistoria/DetailSections";
import { InspectionEditorPanel } from "@/components/vistorias/ficha-vistoria/InspectionEditorPanel";
import { CommentData } from "@/components/vistorias/ficha-vistoria/CommentsTimeline";
import ConnectionStatus from "@/components/shared/ConnectionStatus";
import { getVistoriaById, updateVistoria, addVistoriaComment, generateTokenAcesso, resolveContestacao } from "@/app/(admin)/vistorias/actions";
import { BottomNavigationMobile } from "@/components/vistorias/ficha-vistoria/BottomNavigationMobile";
import { db } from "@/lib/db";

interface InfoGeralItem {
  id: number;
  titulo: string;
  conteudo: string;
}

export default function FichaVistoriaPage() {
  const router = useRouter();
  const params = useParams();
  const vistoriaId = params?.id as string;

  const defaultReportDesc = `Imóvel vistoriado em perfeitas condições de habitação. As paredes encontram-se com pintura nova (tinta Látex Suvinil branca). O piso laminado da sala e dos quartos não apresenta riscos ou desgastes aparentes. Todas as portas e janelas fecham corretamente.\n\nNo banheiro, o blindex possui marcas leves de uso e o chuveiro elétrico (Lorenzetti 220v) está funcionando. Na cozinha, os armários embutidos possuem dobradiças em bom estado. A pia não apresenta vazamentos no sifão.`;
  const defaultReportObs = `Foi notada uma leve marcação na parede próxima à janela do segundo quarto, proveniente de um antigo móvel, sem comprometer a estrutura.`;

  const defaultInfoGeralItems: InfoGeralItem[] = [
    { id: 1, titulo: "Visão Geral", conteudo: "Em perfeitas condições." },
    { id: 2, titulo: "1) PINTURA", conteudo: "O imóvel está pintado com tintas de primeira qualidade: Branco Gelo nas paredes e teto, Esmalte Sintético na cor Branca nas ferragens, e Verniz Marítimo Brilhante nas portas, as pinturas em perfeito estado, sem manchas ou sujeiras." },
    { id: 3, titulo: "2) ELÉTRICA", conteudo: "Toda rede elétrica, incluindo tomadas (todas possuem espelho de tomadas brancos, com ou sem furos), lâmpadas e saídas de energia para chuveiros encontram-se completamente instalados, em perfeito estado e funcionamento." },
    { id: 4, titulo: "3) PISOS E AZULEJOS", conteudo: "O imóvel possui pisos em toda a sua área interna sem buracos, furos ou quaisquer tipos de defeitos, além disso, a cozinha e o banheiro, possuem revestimentos de azulejos em suas paredes. Lembrando que todos os pisos e azulejos estão em perfeito estado de conservação, sem nenhum azulejo quebrado, trincado ou arranhado." },
    { id: 5, titulo: "4) VIDRAÇAS E JANELAS", conteudo: "Todas as janelas, basculantes e vidros estão em perfeitas condições, não apresentam nenhum defeito, trincado, arranhões ou dificuldades no manuseio." },
    { id: 6, titulo: "5) PORTAS", conteudo: "Todas as portas de madeiras e de vidros, estão em perfeitas condições, não apresentam nenhum defeito, trincado, arranhões ou dificuldades no manuseio. Observação: as portas e de madeiras estão envernizadas, bem como, os batentes também estão." },
    { id: 7, titulo: "6) TRINCOS E FECHADURAS", conteudo: "Todas as portas e janelas possuem trincos e fechaduras, em perfeito estado de conservação. Além disso, todas as portas, possuem como já mencionado fechaduras e também chaves. Lembrando que tais acessórios estão em perfeito funcionamento, sem arranhões, defeitos ou dificuldade no seu manuseio." },
    { id: 8, titulo: "7) TELHADO", conteudo: "O teto do imóvel se encontra em perfeitas condições, sem infiltrações, vazamentos ou goteiras." },
    { id: 9, titulo: "8) HIDRÁULICA", conteudo: "Toda rede hidráulica encontra-se em bom estado de conservação e funcionamento, sem entupimentos, vazamentos ou infiltrações aparentes." },
    { id: 10, titulo: "9) LIMPEZA", conteudo: "O imóvel está sendo entregue em perfeito estado, limpo, sem sujeira na caixa de gordura, com as calhas limpas." },
    { id: 11, titulo: "10) INFILTRAÇÕES", conteudo: "O imóvel NÃO apresenta nenhum sinal de infiltração e nem houve infiltrações anteriormente, sendo entregue em perfeito estado nesse aspecto" }
  ];

  const [rooms, setRooms] = useState<Room[]>([]);
  const [comments, setComments] = useState<CommentData[]>([]);
  const [reportDescription, setReportDescription] = useState("");
  const [reportObservation, setReportObservation] = useState("");
  const [infoGeralItems, setInfoGeralItems] = useState<InfoGeralItem[]>([]);
  const [solicitante, setSolicitante] = useState("Não informado");
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'form' | 'planta'>('planta');
  const [activeMobileTab, setActiveMobileTab] = useState<'planta' | 'ambientes' | 'relatorio'>('planta');
  const [activeEditorTab, setActiveEditorTab] = useState<'comments' | 'report' | 'contestations'>('comments');

  const handleMobileTabChange = (tab: 'planta' | 'ambientes' | 'relatorio') => {
    setActiveMobileTab(tab);
    if (tab === 'ambientes') {
      setActiveEditorTab('comments');
    } else if (tab === 'relatorio') {
      setActiveEditorTab('report');
    }
  };

  // Controle de Chaves e Detalhes dinâmicos
  const [chavesQuantidade, setChavesQuantidade] = useState<number>(0);
  const [chavesObservacao, setChavesObservacao] = useState<string>("");
  const [vistoriaStatus, setVistoriaStatus] = useState<string>("");
  const [proprietario, setProprietario] = useState<string>("");
  const [vistoriador, setVistoriador] = useState<string>("");
  const [assinatura, setAssinatura] = useState<string | null>(null);
  const [tokenAcesso, setTokenAcesso] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [contestations, setContestations] = useState<any[]>([]);

  // Load from database on mount
  useEffect(() => {
    async function loadVistoria() {
      if (!vistoriaId) return;
      setLoading(true);

      let dbData: any = null;

      try {
        if (navigator.onLine) {
          const res = await getVistoriaById(vistoriaId);
          if (res.success && res.data) {
            dbData = res.data;

            // Salva ou atualiza cache local no IndexedDB
            await db.vistorias.put({
              id: dbData.id,
              codigo: dbData.codigo,
              tipo: dbData.tipo,
              status: dbData.status,
              data: dbData.data instanceof Date ? dbData.data.toISOString() : String(dbData.data),
              proprietario: dbData.proprietario || "Proprietário",
              endereco: dbData.imovel ? `${dbData.imovel.bairro}, ${dbData.imovel.cidade}/${dbData.imovel.uf}` : "",
              observacoes: dbData.observacoes || "",
              reparosNecessarios: dbData.reparosNecessarios || "",
              chavesQuantidade: dbData.chavesQuantidade || 0,
              chavesObservacao: dbData.chavesObservacao || "",
              ambienteVistorias: dbData.ambienteVistorias || [],
              comentariosVistoria: dbData.comentariosVistoria || [],
              infoGeral: dbData.infoGeral || [],
            });
          }
        }
      } catch (e) {
        console.error("Erro ao buscar da rede, tentando cache local:", e);
      }

      // Se falhar a rede ou estiver offline, busca do Dexie
      if (!dbData) {
        try {
          const localCached = await db.vistorias.get(vistoriaId);
          if (localCached) {
            dbData = {
              ...localCached,
              ambienteVistorias: localCached.ambienteVistorias,
              comentariosVistoria: localCached.comentariosVistoria,
            };
          }
        } catch (e) {
          console.error("Erro ao ler cache local:", e);
        }
      }

      if (dbData) {
        // 1. Mapear ambientes/rooms
        const mappedRooms: Room[] = dbData.ambienteVistorias.map((r: any) => ({
          id: r.id,
          type: r.tipo as RoomType,
          name: r.nome,
          visaoGeral: r.visaoGeral || "",
          comentarios: r.comentarios || ""
        }));
        setRooms(mappedRooms);

        // 2. Mapear timeline comments
        const mappedComments: CommentData[] = dbData.comentariosVistoria.map((c: any) => ({
          id: c.id,
          roomId: c.roomId,
          roomName: c.roomName,
          text: c.texto || c.text,
          status: c.status as 'Aprovado' | 'Atenção',
          timestamp: new Date(c.createdAt || c.timestamp),
          media: c.midias || c.media || []
        }));
        setComments(mappedComments);

        // 3. Mapear parecer geral
        setReportDescription(dbData.observacoes || defaultReportDesc);
        setReportObservation(dbData.reparosNecessarios || defaultReportObs);

        // 4. Mapear info geral JSON
        if (dbData.infoGeral && Array.isArray(dbData.infoGeral)) {
          setInfoGeralItems(dbData.infoGeral as any);
        } else {
          setInfoGeralItems(defaultInfoGeralItems);
        }

        // 5. Mapear solicitante/operador e outros campos
        if (dbData.operador) {
          setSolicitante(`${dbData.operador.firstName} ${dbData.operador.lastName}`);
        } else {
          setSolicitante("Sistema (Offline)");
        }
        
        setChavesQuantidade(dbData.chavesQuantidade || 0);
        setChavesObservacao(dbData.chavesObservacao || "");
        setVistoriaStatus(dbData.status || "");
        setProprietario(dbData.proprietario || "Proprietário");
        setAssinatura(dbData.assinatura || null);
        setTokenAcesso(dbData.tokenAcesso || null);
        setContestations(dbData.contestacaoVistorias || []);
        
        if (dbData.vistoriador) {
          setVistoriador(`${dbData.vistoriador.firstName} ${dbData.vistoriador.lastName}`);
        } else {
          setVistoriador("Vistoriador Responsável");
        }
      } else {
        alert("Erro ao carregar a vistoria. Sem dados em cache local.");
        router.push("/vistorias");
      }
      setLoading(false);
    }

    loadVistoria();
  }, [vistoriaId]);

  const handleOpenShare = async () => {
    setIsShareModalOpen(true);
    if (!tokenAcesso) {
      setIsGeneratingToken(true);
      try {
        const res = await generateTokenAcesso(vistoriaId);
        if (res.success && res.tokenAcesso) {
          setTokenAcesso(res.tokenAcesso);
        } else {
          alert("Não foi possível gerar o link de acesso. Verifique sua conexão.");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsGeneratingToken(false);
      }
    }
  };

  const handleCopyLink = () => {
    if (!tokenAcesso) return;
    const url = `${window.location.origin}/public/vistorias/acesso/${tokenAcesso}`;
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleResolveContestacao = async (contestacaoId: string, input: any) => {
    try {
      const res = await resolveContestacao(contestacaoId, input);
      if (res.success && res.data) {
        // Atualiza a lista localmente
        setContestations(prev => prev.map(c => c.id === contestacaoId ? { ...c, ...res.data } : c));
        alert("Contestação marcada como resolvida!");
      } else {
        alert(res.error || "Erro ao resolver contestação.");
      }
    } catch (err: any) {
      alert("Erro de conexão ao tentar resolver contestação.");
    }
  };

  const handleAddRoom = (room: Room) => {
    setRooms(prev => [...prev, room]);
  };

  const handleRemoveRoom = (roomId: string) => {
    setRooms(prev => prev.filter(r => r.id !== roomId));
  };

  const handleUpdateRoom = (roomId: string, updates: Partial<Room>) => {
    setRooms(prev => prev.map(r => r.id === roomId ? { ...r, ...updates } : r));
  };

  const handleReorderRooms = (newRooms: Room[]) => {
    setRooms(newRooms);
  };

  const handleUpdateInfoGeralItem = (id: number, newConteudo: string) => {
    setInfoGeralItems(prev => prev.map(item => item.id === id ? { ...item, conteudo: newConteudo } : item));
  };

  const handleAddComment = async (
    roomId: string,
    roomName: string,
    text: string,
    status: 'Aprovado' | 'Atenção',
    media?: { url: string; type: 'image' | 'video' }[]
  ) => {
    if (!vistoriaId) return;

    if (navigator.onLine) {
      const res = await addVistoriaComment(vistoriaId, {
        roomId,
        roomName,
        text,
        status,
        media
      });

      if (res.success && res.data) {
        const newComment: CommentData = {
          id: res.data.id,
          roomId,
          roomName,
          text,
          status,
          timestamp: new Date(res.data.createdAt),
          media
        };
        setComments(prev => [newComment, ...prev]);

        // Atualiza cache local
        const localCached = await db.vistorias.get(vistoriaId);
        if (localCached) {
          localCached.comentariosVistoria.unshift({
            id: res.data.id,
            roomId,
            roomName,
            texto: text,
            status,
            createdAt: res.data.createdAt,
            midias: media || []
          });
          await db.vistorias.put(localCached);
        }
      } else {
        alert("Ocorreu um erro ao salvar o comentário no banco de dados.");
      }
    } else {
      // Offline Flow
      const tempId = "temp-" + Date.now();
      const newComment: CommentData = {
        id: tempId,
        roomId,
        roomName,
        text,
        status,
        timestamp: new Date(),
        media
      };
      setComments(prev => [newComment, ...prev]);

      // Salva no cache local do Dexie
      const localCached = await db.vistorias.get(vistoriaId);
      if (localCached) {
        localCached.comentariosVistoria.unshift({
          id: tempId,
          roomId,
          roomName,
          texto: text,
          status,
          createdAt: new Date().toISOString(),
          midias: media || []
        });
        await db.vistorias.put(localCached);
      }

      // Enfileira na fila de sincronização
      await db.syncQueue.put({
        type: "ADD_COMMENT",
        vistoriaId,
        payload: {
          roomId,
          roomName,
          text,
          status,
          media
        },
        timestamp: Date.now()
      });
    }
  };

  const handleSaveDatabase = async () => {
    if (!vistoriaId) return;
    setIsSaving(true);

    const payload = {
      status: "EM_ANDAMENTO" as any, // Muda status para em andamento após edição
      observacoes: reportDescription,
      reparosNecessarios: reportObservation,
      infoGeral: infoGeralItems,
      chavesQuantidade,
      chavesObservacao,
      rooms: rooms.map(r => ({
        id: r.id,
        name: r.name,
        type: r.type,
        visaoGeral: r.visaoGeral,
        comentarios: r.comentarios
      }))
    };

    if (navigator.onLine) {
      const res = await updateVistoria(vistoriaId, payload);
      setIsSaving(false);
      if (res.success) {
        alert("Vistoria salva com sucesso no banco de dados!");
        // Atualiza cache local
        const localCached = await db.vistorias.get(vistoriaId);
        if (localCached) {
          await db.vistorias.put({
            ...localCached,
            status: "EM_ANDAMENTO",
            observacoes: reportDescription,
            reparosNecessarios: reportObservation,
            infoGeral: infoGeralItems,
            chavesQuantidade,
            chavesObservacao,
            ambienteVistorias: rooms.map(r => ({
              id: r.id,
              nome: r.name,
              tipo: r.type,
              visaoGeral: r.visaoGeral,
              comentarios: r.comentarios
            }))
          });
        }
      } else {
        alert(res.error || "Erro ao salvar a vistoria.");
      }
    } else {
      // Offline Flow
      setIsSaving(false);
      
      // Atualiza cache local no IndexedDB
      const localCached = await db.vistorias.get(vistoriaId);
      if (localCached) {
        await db.vistorias.put({
          ...localCached,
          status: "EM_ANDAMENTO",
          observacoes: reportDescription,
          reparosNecessarios: reportObservation,
          infoGeral: infoGeralItems,
          chavesQuantidade,
          chavesObservacao,
          ambienteVistorias: rooms.map(r => ({
            id: r.id,
            nome: r.name,
            tipo: r.type,
            visaoGeral: r.visaoGeral,
            comentarios: r.comentarios
          })),
          pendingSync: true
        });
      }

      // Enfileira alteração
      await db.syncQueue.put({
        type: "UPDATE_VISTORIA",
        vistoriaId,
        payload,
        timestamp: Date.now()
      });

      alert("Vistoria salva localmente (offline)! Ela será sincronizada automaticamente quando você recuperar a conexão.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#004777]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full max-w-[1600px] bg-white mx-auto gap-6 pb-20 md:pb-16 px-2 sm:px-0 h-[100dvh] md:h-auto overflow-hidden md:overflow-visible">

      {/* Top Header / Breadcrumb */}
      <header className="flex flex-col md:flex-row md:items-center justify-between bg-white p-4 sm:p-6 rounded-2xl border border-[#EEEEF3] shadow-sm gap-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/vistorias')}
            className="p-2 hover:bg-[#EEEEF3] rounded-lg transition-colors text-gray-500 hover:text-[#004777] print:hidden"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#280003] tracking-tight">
                Ficha de Vistoria <span className="text-[#004777]">#{vistoriaId}</span>
              </h1>
              <div className="print:hidden">
                <ConnectionStatus />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              Visualize o mapa do imóvel e todos os detalhes técnicos integrados com o banco de dados.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 print:hidden">
          <button
            onClick={handleOpenShare}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#004777] text-white rounded-lg text-sm font-semibold hover:bg-[#00365a] transition-all shadow-sm"
          >
            <Share2 className="w-4 h-4" />
            <span>Enviar p/ Inquilino</span>
          </button>

          <button
            onClick={handleSaveDatabase}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#708D81] text-white rounded-lg text-sm font-semibold hover:bg-[#5b756b] transition-all shadow-sm disabled:opacity-60"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Salvar no Banco</span>
          </button>

          <button
            onClick={() => window.print()}
            className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-slate-100 border border-slate-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-all shadow-sm"
          >
            <FileText className="w-4 h-4" />
            <span>Gerar PDF Oficial</span>
          </button>
        </div>
      </header>

      {/* Split Screen Layout */}
      <div className="flex flex-col lg:flex-row print:flex-col gap-8 items-start w-full flex-1 overflow-y-auto lg:overflow-visible pb-12 lg:pb-0">

        {/* Left Side: Visualizer, Composição & Details (Scrollable) */}
        <div className={`w-full lg:w-[60%] print:w-full flex flex-col gap-10 lg:flex ${
          activeMobileTab === 'planta' || activeMobileTab === 'relatorio' ? 'block' : 'hidden'
        }`}>

          <div className={`flex flex-col gap-4 ${activeMobileTab === 'planta' ? 'block' : 'hidden lg:block'}`}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#280003] flex items-center gap-2">
                <Grid2X2 className="w-5 h-5 text-[#004777]" />
                Composição do Imóvel
              </h2>

              {/* View Mode Toggle */}
              <div className="flex bg-[#EEEEF3]/80 p-1 rounded-xl w-fit border border-[#EEEEF3] print:hidden">
                <button
                  onClick={() => setViewMode('form')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${viewMode === 'form'
                    ? 'bg-white text-[#004777] shadow-sm border border-gray-100'
                    : 'text-gray-500 hover:text-[#280003]'
                    }`}
                >
                  <Edit3 className="w-4 h-4" />
                  Formulário
                </button>
                <button
                  onClick={() => setViewMode('planta')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${viewMode === 'planta'
                    ? 'bg-white text-[#004777] shadow-sm border border-gray-100'
                    : 'text-gray-500 hover:text-[#280003]'
                    }`}
                >
                  <Map className="w-4 h-4" />
                  Planta 2D
                </button>
              </div>
            </div>

            <div className="w-full relative transition-all duration-300">
              <div className={viewMode === 'form' ? 'block print:hidden' : 'hidden'}>
                <RoomBuilderForm
                  rooms={rooms}
                  onAddRoom={handleAddRoom}
                  onRemoveRoom={handleRemoveRoom}
                  onUpdateRoom={handleUpdateRoom}
                  onReorderRooms={handleReorderRooms}
                />
              </div>
              <div className={viewMode === 'planta' ? 'block' : 'hidden print:block'}>
                <FloorPlanVisualizer rooms={rooms} />
              </div>
            </div>
          </div>

          <div className={activeMobileTab === 'relatorio' ? 'block' : 'hidden lg:block'}>
            <DetailSections
              comments={comments}
              reportDescription={reportDescription}
              reportObservation={reportObservation}
              rooms={rooms}
              solicitante={solicitante}
              infoGeralItems={infoGeralItems}
              onUpdateInfoGeralItem={handleUpdateInfoGeralItem}
              chavesQuantidade={chavesQuantidade}
              chavesObservacao={chavesObservacao}
              vistoriaStatus={vistoriaStatus}
              proprietario={proprietario}
              vistoriador={vistoriador}
              assinatura={assinatura}
            />
          </div>
        </div>

        {/* Right Side: Editor Panel (Sticky) */}
        <div className={`w-full lg:w-[40%] flex flex-col gap-6 lg:sticky lg:top-24 print:hidden lg:flex ${
          activeMobileTab === 'ambientes' || activeMobileTab === 'relatorio' ? 'block' : 'hidden'
        }`}>
          <InspectionEditorPanel
            rooms={rooms}
            comments={comments}
            onAddComment={handleAddComment}
            reportDescription={reportDescription}
            reportObservation={reportObservation}
            onUpdateReport={(desc, obs) => {
              setReportDescription(desc);
              setReportObservation(obs);
            }}
            onUpdateRoom={handleUpdateRoom}
            chavesQuantidade={chavesQuantidade}
            chavesObservacao={chavesObservacao}
            onUpdateKeys={(qtd, obs) => {
              setChavesQuantidade(qtd);
              setChavesObservacao(obs);
            }}
            infoGeralItems={infoGeralItems}
            onUpdateInfoGeralItem={handleUpdateInfoGeralItem}
            activeTab={activeEditorTab}
            onTabChange={setActiveEditorTab}
            contestations={contestations}
            onResolveContestacao={handleResolveContestacao}
          />
        </div>

      </div>

      {/* Bottom Navigation for mobile screens */}
      <BottomNavigationMobile activeTab={activeMobileTab} onChange={handleMobileTabChange} />

      {/* Share Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-[#EEEEF3] flex flex-col">
            <div className="bg-[#004777] p-5 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5" />
                <h3 className="font-bold text-base">Enviar para Inquilino</h3>
              </div>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="text-white/80 hover:text-white transition-colors text-2xl font-light"
              >
                &times;
              </button>
            </div>
            
            <div className="p-6 flex flex-col gap-4">
              <p className="text-xs text-gray-500 leading-relaxed">
                Copie o link abaixo e envie para o inquilino. Para acessar o laudo de vistoria com segurança, ele precisará informar seu CPF/CNPJ de cadastro.
              </p>

              {isGeneratingToken ? (
                <div className="flex items-center justify-center py-6 gap-2 text-[#004777] text-sm font-semibold">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Gerando link seguro...</span>
                </div>
              ) : (
                <div className="flex flex-col gap-2 mt-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={typeof window !== "undefined" ? `${window.location.origin}/public/vistorias/acesso/${tokenAcesso || ""}` : ""}
                      className="flex-1 bg-gray-50 border border-[#EEEEF3] px-3 py-2.5 rounded-lg text-xs font-mono select-all focus:outline-none"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="px-4 py-2.5 bg-[#004777] hover:bg-[#00365a] text-white rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-1.5"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopied ? "Copiado" : "Copiar"}</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-[#EEEEF3]">
                <button
                  type="button"
                  onClick={() => setIsShareModalOpen(false)}
                  className="px-4 py-2 border border-[#EEEEF3] rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
