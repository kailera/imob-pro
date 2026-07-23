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
import { getVistoriaById, updateVistoria, addVistoriaComment, updateVistoriaComment, deleteVistoriaComment, generateTokenAcesso, resolveContestacao, getCurrentUser, getLocatarios, associateTenantToVistoria, createInquilino } from "@/app/(admin)/vistorias/actions";
import { BottomNavigationMobile } from "@/components/vistorias/ficha-vistoria/BottomNavigationMobile";
import { db } from "@/lib/db";
import PWAInstallPrompt from "@/components/shared/PWAInstallPrompt";
import type { InspectionAttachment } from "@/components/vistorias/ficha-vistoria/DocumentsPhotosSection";

export default function FichaVistoriaPage() {
  const router = useRouter();
  const params = useParams();
  const vistoriaId = params?.id as string;

  const defaultReportDesc = "";
  const defaultReportObs = "";

  const [rooms, setRooms] = useState<Room[]>([]);
  const [comments, setComments] = useState<CommentData[]>([]);
  const [reportDescription, setReportDescription] = useState("");
  const [reportObservation, setReportObservation] = useState("");
  const [attachments, setAttachments] = useState<InspectionAttachment[]>([]);
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
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Estados para associação de Inquilino
  const [associatedLocatarioId, setAssociatedLocatarioId] = useState<string | null>(null);
  const [authorizedLocatarioIds, setAuthorizedLocatarioIds] = useState<string[]>([]);
  const [locatarios, setLocatarios] = useState<any[]>([]);
  const [selectedLocatarioId, setSelectedLocatarioId] = useState<string>("");
  const [loadingLocatarios, setLoadingLocatarios] = useState(false);
  const [isAssociating, setIsAssociating] = useState(false);

  const [shareModalTab, setShareModalTab] = useState<'select' | 'create'>('select');
  const [newInquilinoNome, setNewInquilinoNome] = useState("");
  const [newInquilinoCpf, setNewInquilinoCpf] = useState("");
  const [newInquilinoEmail, setNewInquilinoEmail] = useState("");
  const [newInquilinoTelefone, setNewInquilinoTelefone] = useState("");
  const [isCreatingInquilino, setIsCreatingInquilino] = useState(false);

  // Load from database on mount
  useEffect(() => {
    async function loadVistoria() {
      if (!vistoriaId) return;
      setLoading(true);

      // Carregar usuário logado
      try {
        const userRes = await getCurrentUser();
        if (userRes.success) {
          setCurrentUser(userRes.data);
        }
      } catch (err) {
        console.error("Erro ao carregar usuário logado:", err);
      }

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
        if (dbData.infoGeral && !Array.isArray(dbData.infoGeral) && Array.isArray(dbData.infoGeral.attachments)) {
          setAttachments(dbData.infoGeral.attachments);
        } else {
          setAttachments([]);
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
        setAssociatedLocatarioId(dbData.locatarioId || null);
        setAuthorizedLocatarioIds(Array.from(new Set([
          ...(dbData.locatariosAutorizados || []).map((item: any) => item.locatarioId),
          ...(dbData.locatarioId ? [dbData.locatarioId] : []),
        ])) as string[]);
        
        if (dbData.vistoriador) {
          const creciText = dbData.vistoriador.creci ? ` (CRECI: ${dbData.vistoriador.creci})` : "";
          setVistoriador(`${dbData.vistoriador.firstName} ${dbData.vistoriador.lastName}${creciText}`);
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

    // Carregar inquilinos se ainda não carregados
    if (locatarios.length === 0) {
      setLoadingLocatarios(true);
      try {
        const res = await getLocatarios();
        if (res.success && res.data) {
          setLocatarios(res.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingLocatarios(false);
      }
    }

    // Se já tiver inquilino associado, gera token caso não tenha
    if (associatedLocatarioId && !tokenAcesso) {
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

  const handleAssociateTenant = async () => {
    if (!selectedLocatarioId) return;
    setIsAssociating(true);
    try {
      const res = await associateTenantToVistoria(vistoriaId, selectedLocatarioId);
      if (res.success) {
        setAssociatedLocatarioId((current) => current || selectedLocatarioId);
        setAuthorizedLocatarioIds((current) =>
          current.includes(selectedLocatarioId) ? current : [...current, selectedLocatarioId]
        );
        setSelectedLocatarioId("");
        
        // Agora gera o token de acesso
        setIsGeneratingToken(true);
        const tokenRes = await generateTokenAcesso(vistoriaId);
        if (tokenRes.success && tokenRes.tokenAcesso) {
          setTokenAcesso(tokenRes.tokenAcesso);
        } else {
          alert("Não foi possível gerar o link de acesso.");
        }
      } else {
        alert(res.error || "Erro ao associar inquilino.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao conectar ao servidor.");
    } finally {
      setIsAssociating(false);
      setIsGeneratingToken(false);
    }
  };

  const handleCreateAndAssociateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInquilinoNome || !newInquilinoCpf || !newInquilinoEmail || !newInquilinoTelefone) {
      alert("Preencha todos os campos obrigatórios.");
      return;
    }
    setIsCreatingInquilino(true);
    try {
      const res = await createInquilino({
        nome: newInquilinoNome,
        cpfCnpj: newInquilinoCpf,
        email: newInquilinoEmail,
        telefone: newInquilinoTelefone
      });
      if (res.success && res.data) {
        setLocatarios(prev => [...prev, res.data]);
        
        const assocRes = await associateTenantToVistoria(vistoriaId, res.data.id);
        if (assocRes.success) {
          setAssociatedLocatarioId(res.data.id);
          setAuthorizedLocatarioIds((current) =>
            current.includes(res.data.id) ? current : [...current, res.data.id]
          );
          
          setIsGeneratingToken(true);
          const tokenRes = await generateTokenAcesso(vistoriaId);
          if (tokenRes.success && tokenRes.tokenAcesso) {
            setTokenAcesso(tokenRes.tokenAcesso);
            // Limpa form
            setNewInquilinoNome("");
            setNewInquilinoCpf("");
            setNewInquilinoEmail("");
            setNewInquilinoTelefone("");
          } else {
            alert("Inquilino criado e vinculado, mas não foi possível gerar o link de acesso.");
          }
        } else {
          alert("Inquilino criado, mas houve um erro ao vinculá-lo à vistoria.");
        }
      } else {
        alert(res.error || "Erro ao criar inquilino.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro de conexão ao criar inquilino.");
    } finally {
      setIsCreatingInquilino(false);
    }
  };

  const handleCopyLink = () => {
    if (!tokenAcesso) return;
    const url = `${window.location.origin}/vistorias/acesso/${tokenAcesso}`;
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const getWhatsAppLink = () => {
    if (!tokenAcesso) return "";
    const url = `${window.location.origin}/vistorias/acesso/${tokenAcesso}`;
    
    const tenant = locatarios.find((l) => l.id === associatedLocatarioId);
    let phoneNum = "";
    if (tenant && tenant.telefone) {
      try {
        const phones = typeof tenant.telefone === "string" ? JSON.parse(tenant.telefone) : tenant.telefone;
        if (Array.isArray(phones) && phones.length > 0) {
          const rawNum = phones[0]?.numero || "";
          phoneNum = rawNum.replace(/\D/g, "");
          if (phoneNum.length === 11 || phoneNum.length === 10) {
            phoneNum = "55" + phoneNum;
          }
        }
      } catch (e) {
        console.error(e);
      }
    }

    const message = encodeURIComponent(
      `Olá! Segue o link para visualizar e assinar a sua Ficha de Vistoria (onde também poderá gerar o PDF Oficial): ${url}`
    );

    if (phoneNum) {
      return `https://wa.me/${phoneNum}?text=${message}`;
    }
    return `https://wa.me/?text=${message}`;
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
          tempCommentId: tempId,
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

  const handleUpdateComment = async (
    commentId: string,
    text: string,
    status: 'Aprovado' | 'Atenção',
    media?: { url: string; type: 'image' | 'video' }[]
  ) => {
    if (!vistoriaId) return;

    setComments(prev => prev.map(c => c.id === commentId ? { ...c, text, status, media: media || [] } : c));

    const localCached = await db.vistorias.get(vistoriaId);
    if (localCached) {
      const updatedComments = localCached.comentariosVistoria.map((c: any) => {
        if (c.id === commentId) {
          return {
            ...c,
            texto: text,
            status,
            midias: media || []
          };
        }
        return c;
      });
      await db.vistorias.put({ ...localCached, comentariosVistoria: updatedComments });
    }

    if (navigator.onLine && !commentId.startsWith("temp-")) {
      const res = await updateVistoriaComment(commentId, { text, status, media });
      if (!res.success) {
        alert("Ocorreu um erro ao atualizar o comentário no servidor. A alteração foi salva localmente.");
      }
    } else {
      await db.syncQueue.put({
        type: "UPDATE_COMMENT",
        vistoriaId,
        payload: {
          commentId,
          text,
          status,
          media
        },
        timestamp: Date.now()
      });
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!vistoriaId) return;

    setComments(prev => prev.filter(c => c.id !== commentId));

    const localCached = await db.vistorias.get(vistoriaId);
    if (localCached) {
      const updatedComments = localCached.comentariosVistoria.filter((c: any) => c.id !== commentId);
      await db.vistorias.put({ ...localCached, comentariosVistoria: updatedComments });
    }

    if (navigator.onLine && !commentId.startsWith("temp-")) {
      const res = await deleteVistoriaComment(commentId);
      if (!res.success) {
        alert("Ocorreu um erro ao excluir o comentário no servidor. A alteração foi salva localmente.");
      }
    } else {
      await db.syncQueue.put({
        type: "DELETE_COMMENT",
        vistoriaId,
        payload: {
          commentId
        },
        timestamp: Date.now()
      });
    }
  };

  const handleSaveDatabase = async () => {
    if (!vistoriaId) return;
    setIsSaving(true);

    const nextStatus = vistoriaStatus === "NAO_INICIADA" ? "EM_ANDAMENTO" : vistoriaStatus;

    const payload = {
      status: nextStatus as any,
      observacoes: reportDescription,
      reparosNecessarios: reportObservation,
      infoGeral: { attachments },
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
        setVistoriaStatus(nextStatus);
        alert("Vistoria salva com sucesso no banco de dados!");
        // Atualiza cache local
        const localCached = await db.vistorias.get(vistoriaId);
        if (localCached) {
          await db.vistorias.put({
            ...localCached,
            status: nextStatus,
            observacoes: reportDescription,
            reparosNecessarios: reportObservation,
            infoGeral: { attachments },
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
      setVistoriaStatus(nextStatus);
      
      // Atualiza cache local no IndexedDB
      const localCached = await db.vistorias.get(vistoriaId);
      if (localCached) {
        await db.vistorias.put({
          ...localCached,
          status: nextStatus,
          observacoes: reportDescription,
          reparosNecessarios: reportObservation,
          infoGeral: { attachments },
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

  const handleUpdateStatus = async (newStatus: string) => {
    if (!vistoriaId) return;
    setIsSaving(true);

    const payload = {
      status: newStatus as any,
    };

    if (navigator.onLine) {
      const res = await updateVistoria(vistoriaId, payload);
      setIsSaving(false);
      if (res.success) {
        setVistoriaStatus(newStatus);
        alert(`Status da vistoria atualizado para: ${newStatus}`);
        
        // Atualiza cache local
        const localCached = await db.vistorias.get(vistoriaId);
        if (localCached) {
          await db.vistorias.put({
            ...localCached,
            status: newStatus,
          });
        }
      } else {
        alert(res.error || "Erro ao atualizar status.");
      }
    } else {
      setIsSaving(false);
      setVistoriaStatus(newStatus);
      // Offline Flow
      const localCached = await db.vistorias.get(vistoriaId);
      if (localCached) {
        await db.vistorias.put({
          ...localCached,
          status: newStatus,
          pendingSync: true
        });
      }
      await db.syncQueue.put({
        type: "UPDATE_VISTORIA",
        vistoriaId,
        payload,
        timestamp: Date.now()
      });
      alert("Status atualizado offline! Será sincronizado quando reestabelecer conexão.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#004777]" />
      </div>
    );
  }

  const isBrokerOrAdmin = currentUser?.role === "ADMIN" || currentUser?.role === "CORRETOR";
  const canEdit = vistoriaStatus === "NAO_INICIADA" || vistoriaStatus === "EM_ANDAMENTO" || vistoriaStatus === "CONTESTADA" || isBrokerOrAdmin;
  const headerActionClass = "inline-flex h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg border px-3 text-sm font-semibold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004777]/35 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-[190px] sm:flex-none";

  return (
    <div className="flex flex-col w-full max-w-[1600px] bg-white mx-auto gap-6 pb-20 md:pb-16 px-2 sm:px-0 h-[100dvh] md:h-auto overflow-hidden md:overflow-visible print:h-auto print:overflow-visible print:max-w-none print:p-0 print:gap-0">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Hide non-report layout elements */
          nav, header, footer, button, .print\\:hidden, [role="navigation"], .no-print {
            display: none !important;
          }
          
          /* Reset container margins/paddings */
          body, html, #__next, main, .min-h-screen, .max-w-7xl, .max-w-\\[1600px\\], .mx-auto, .p-6, .md\\:p-8, .pt-20 {
            background: white !important;
            color: black !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            padding: 0 !important;
            margin: 0 !important;
            max-width: none !important;
            width: 100% !important;
            position: relative !important;
          }

          /* Ensure page breaks are handled nicely */
          section, .break-inside-avoid {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}} />

      {/* Top Header / Breadcrumb */}
      <header className="flex flex-col md:flex-row md:items-center justify-between bg-white p-4 sm:p-6 rounded-2xl border border-[#EEEEF3] shadow-sm gap-4 flex-shrink-0 print:hidden">
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

        <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end print:hidden">
          {/* Botão Enviar para Aprovação */}
          {["NAO_INICIADA", "EM_ANDAMENTO", "CONTESTADA"].includes(vistoriaStatus) && (
            <button
              onClick={() => handleUpdateStatus("AGUARDANDO_APROVACAO")}
              disabled={isSaving}
              className={`${headerActionClass} border-amber-500 bg-amber-500 text-white hover:border-amber-600 hover:bg-amber-600`}
            >
              Enviar para Aprovação
            </button>
          )}

          {/* Botões de Aprovar e Reprovar para ADMIN e CORRETOR */}
          {vistoriaStatus === "AGUARDANDO_APROVACAO" && (
            isBrokerOrAdmin ? (
              <>
                <button
                  onClick={() => handleUpdateStatus("CONCLUIDA")}
                  disabled={isSaving}
                  className={`${headerActionClass} border-emerald-600 bg-emerald-600 text-white hover:border-emerald-700 hover:bg-emerald-700`}
                >
                  Aprovar Vistoria
                </button>
                <button
                  onClick={() => handleUpdateStatus("EM_ANDAMENTO")}
                  disabled={isSaving}
                  className={`${headerActionClass} border-rose-600 bg-rose-600 text-white hover:border-rose-700 hover:bg-rose-700`}
                >
                  Reprovar Vistoria
                </button>
              </>
            ) : (
              <span className={`${headerActionClass} border-amber-200 bg-amber-50 text-amber-700 shadow-none`}>
                Aguardando Aprovação
              </span>
            )
          )}

          <button
            onClick={handleOpenShare}
            className={`${headerActionClass} border-[#004777] bg-[#004777] text-white hover:border-[#00365a] hover:bg-[#00365a]`}
          >
            <Share2 className="w-4 h-4" />
            <span>Enviar p/ Inquilino</span>
          </button>

          {/* Salvar no Banco - Apenas se não concluída e se editável */}
          {vistoriaStatus !== "CONCLUIDA" && (
            <button
              onClick={handleSaveDatabase}
              disabled={isSaving}
              className={`${headerActionClass} border-[#708D81] bg-[#708D81] text-white hover:border-[#5b756b] hover:bg-[#5b756b]`}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Salvar no Banco</span>
            </button>
          )}

          <button
            onClick={() => window.print()}
            className={`${headerActionClass} hidden border-slate-200 bg-slate-100 text-gray-700 hover:border-slate-300 hover:bg-slate-200 sm:inline-flex`}
          >
            <FileText className="w-4 h-4" />
            <span>Gerar PDF Oficial</span>
          </button>
        </div>
      </header>

      {/* Split Screen Layout */}
      <div className="flex flex-col lg:flex-row print:flex-col gap-8 items-start w-full flex-1 overflow-y-auto lg:overflow-visible pb-12 lg:pb-0 print:overflow-visible print:h-auto print:p-0 print:gap-0">

        {/* Left Side: Visualizer, Composição & Details (Scrollable) */}
        <div className={`w-full lg:w-[60%] print:w-full print:block flex flex-col gap-10 lg:flex ${
          activeMobileTab === 'planta' || activeMobileTab === 'relatorio' ? 'block' : 'hidden'
        }`}>

          <div className={`flex flex-col gap-4 print:hidden ${activeMobileTab === 'planta' ? 'block' : 'hidden lg:block'}`}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#280003] flex items-center gap-2">
                <Grid2X2 className="w-5 h-5 text-[#004777]" />
                Composição do Imóvel
              </h2>

              {/* View Mode Toggle */}
              {canEdit && (
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
              )}
            </div>

            <div className="w-full relative transition-all duration-300">
              <div className={canEdit && viewMode === 'form' ? 'block print:hidden' : 'hidden'}>
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

          <div className={`print:block ${activeMobileTab === 'relatorio' ? 'block' : 'hidden lg:block'}`}>
            <DetailSections
              comments={comments}
              reportDescription={reportDescription}
              reportObservation={reportObservation}
              rooms={rooms}
              solicitante={solicitante}
              attachments={attachments}
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
            onUpdateComment={handleUpdateComment}
            onDeleteComment={handleDeleteComment}
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
            attachments={attachments}
            onUpdateAttachments={setAttachments}
            activeTab={activeEditorTab}
            onTabChange={setActiveEditorTab}
            contestations={contestations}
            onResolveContestacao={handleResolveContestacao}
            disabled={!canEdit}
            userRole={currentUser?.role}
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
              {!associatedLocatarioId ? (
                <div className="flex flex-col gap-3">
                  <div className="flex border-b border-[#EEEEF3] bg-gray-50/50 rounded-lg p-0.5 mb-2">
                    <button
                      type="button"
                      onClick={() => setShareModalTab('select')}
                      className={`flex-1 py-1.5 rounded-md text-[11px] font-bold transition-all ${
                        shareModalTab === 'select'
                          ? 'bg-white text-[#004777] shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Selecionar Cadastrado
                    </button>
                    <button
                      type="button"
                      onClick={() => setShareModalTab('create')}
                      className={`flex-1 py-1.5 rounded-md text-[11px] font-bold transition-all ${
                        shareModalTab === 'create'
                          ? 'bg-white text-[#004777] shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Criar Novo Inquilino
                    </button>
                  </div>

                  {shareModalTab === 'select' ? (
                    <>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        Esta vistoria ainda não possui um inquilino diretamente associado. Selecione um inquilino cadastrado para prosseguir com o envio:
                      </p>
                      
                      {loadingLocatarios ? (
                        <div className="flex items-center gap-2 text-xs text-gray-500 py-2">
                          <Loader2 className="w-4 h-4 animate-spin text-[#004777]" />
                          <span>Carregando inquilinos...</span>
                        </div>
                      ) : (
                        <select
                          value={selectedLocatarioId}
                          onChange={(e) => setSelectedLocatarioId(e.target.value)}
                          className="w-full px-3 py-2.5 border border-[#EEEEF3] rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#004777]/25 text-gray-800"
                        >
                          <option value="">Selecione o inquilino...</option>
                          {locatarios.map((loc) => (
                            <option key={loc.id} value={loc.id}>
                              {loc.nome} - {loc.cpfCnpj}
                            </option>
                          ))}
                        </select>
                      )}

                      <button
                        onClick={handleAssociateTenant}
                        disabled={!selectedLocatarioId || isAssociating}
                        className="w-full mt-2 py-2.5 bg-[#004777] hover:bg-[#00365a] text-white rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isAssociating ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Associando inquilino...</span>
                          </>
                        ) : (
                          <span>Vincular Inquilino e Gerar Link</span>
                        )}
                      </button>
                    </>
                  ) : (
                    <form onSubmit={handleCreateAndAssociateTenant} className="flex flex-col gap-3">
                      <p className="text-[11px] text-gray-500 leading-relaxed mb-1">
                        Preencha as informações básicas para cadastrar e vincular o novo inquilino:
                      </p>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-bold text-gray-450 uppercase">Nome Completo</label>
                        <input
                          type="text"
                          required
                          value={newInquilinoNome}
                          onChange={(e) => setNewInquilinoNome(e.target.value)}
                          placeholder="Ex: João da Silva"
                          className="w-full px-3 py-2 border border-[#EEEEF3] rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#004777]/25 text-[#280003]"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-bold text-gray-450 uppercase">CPF / CNPJ</label>
                        <input
                          type="text"
                          required
                          value={newInquilinoCpf}
                          onChange={(e) => setNewInquilinoCpf(e.target.value)}
                          placeholder="Ex: 000.000.000-00"
                          className="w-full px-3 py-2 border border-[#EEEEF3] rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#004777]/25 text-[#280003]"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-bold text-gray-450 uppercase">E-mail</label>
                        <input
                          type="email"
                          required
                          value={newInquilinoEmail}
                          onChange={(e) => setNewInquilinoEmail(e.target.value)}
                          placeholder="Ex: joao@email.com"
                          className="w-full px-3 py-2 border border-[#EEEEF3] rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#004777]/25 text-[#280003]"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-bold text-gray-450 uppercase">Telefone (WhatsApp)</label>
                        <input
                          type="tel"
                          required
                          value={newInquilinoTelefone}
                          onChange={(e) => setNewInquilinoTelefone(e.target.value)}
                          placeholder="Ex: (11) 99999-9999"
                          className="w-full px-3 py-2 border border-[#EEEEF3] rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#004777]/25 text-[#280003]"
                        />
                      </div>
                      
                      <button
                        type="submit"
                        disabled={isCreatingInquilino}
                        className="w-full mt-2 py-2.5 bg-[#004777] hover:bg-[#00365a] text-white rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isCreatingInquilino ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Cadastrando e Vinculando...</span>
                          </>
                        ) : (
                          <span>Cadastrar, Vincular e Gerar Link</span>
                        )}
                      </button>
                    </form>
                  )}
                </div>
              ) : (
                <>
                  <div className="rounded-lg border border-[#EEEEF3] bg-slate-50 p-3">
                    <p className="mb-2 text-[11px] font-bold text-[#004777]">Vincular outro inquilino</p>
                    <p className="mb-2 text-[10px] leading-relaxed text-gray-500">
                      O inquilino adicional poderá abrir este mesmo link usando o próprio CPF/CNPJ.
                    </p>
                    <div className="flex gap-2">
                      <select
                        value={selectedLocatarioId}
                        onChange={(e) => setSelectedLocatarioId(e.target.value)}
                        disabled={loadingLocatarios || isAssociating}
                        className="min-w-0 flex-1 rounded-lg border border-[#EEEEF3] bg-white px-3 py-2 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#004777]/25"
                      >
                        <option value="">
                          {loadingLocatarios ? "Carregando inquilinos..." : "Selecione outro inquilino..."}
                        </option>
                        {locatarios
                          .filter((loc) => !authorizedLocatarioIds.includes(loc.id))
                          .map((loc) => (
                            <option key={loc.id} value={loc.id}>
                              {loc.nome} - {loc.cpfCnpj}
                            </option>
                          ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleAssociateTenant}
                        disabled={!selectedLocatarioId || isAssociating}
                        className="rounded-lg bg-[#004777] px-3 py-2 text-xs font-semibold text-white transition-all hover:bg-[#00365a] disabled:opacity-50"
                      >
                        {isAssociating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Vincular"}
                      </button>
                    </div>
                  </div>

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
                          value={typeof window !== "undefined" ? `${window.location.origin}/vistorias/acesso/${tokenAcesso || ""}` : ""}
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

                      <a
                        href={getWhatsAppLink()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full mt-2 py-2.5 bg-[#25D366] hover:bg-[#20ba56] text-white rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-sm"
                      >
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.5-5.729-1.448L0 24zm6.59-4.846c1.6.95 3.182 1.449 4.825 1.451 5.436 0 9.86-4.42 9.863-9.864.001-2.637-1.03-5.114-2.905-6.989-1.874-1.875-4.354-2.907-6.994-2.908-5.441 0-9.87 4.423-9.873 9.866-.001 1.777.462 3.508 1.34 5.04L1.758 21.8l5.221-1.369zm11.36-5.467c-.29-.145-1.716-.847-1.978-.942-.262-.096-.453-.145-.642.145-.19.29-.738.942-.905 1.134-.167.19-.334.212-.624.067-2.94-1.464-4.834-3.15-5.83-4.872-.26-.45-.03-.693.195-.918.202-.203.447-.522.67-.783.223-.261.298-.448.447-.753.149-.304.075-.57-.038-.76-.112-.19-.942-2.272-1.292-3.113-.34-.82-.686-.71-1.018-.727-.262-.013-.562-.016-.861-.016-.3 0-.787.113-1.198.563-.411.45-1.57 1.533-1.57 3.737 0 2.203 1.603 4.331 1.826 4.632.223.3 3.157 4.82 7.647 6.756 1.07.463 1.905.74 2.556.947 1.075.34 2.053.292 2.826.177.86-.128 2.624-1.072 2.993-2.108.37-1.035.37-1.922.26-2.107-.11-.188-.4-.29-.69-.435z" />
                        </svg>
                        <span>Enviar por WhatsApp</span>
                      </a>

                      <div className="mt-2 text-[10px] text-gray-500 bg-slate-50 border border-slate-100 p-2.5 rounded-lg">
                        <strong>Inquilinos vinculados:</strong>{" "}
                        {authorizedLocatarioIds
                          .map((id) => locatarios.find((loc) => loc.id === id)?.nome)
                          .filter(Boolean)
                          .join(", ") || "Inquilino selecionado"}
                      </div>
                    </div>
                  )}
                </>
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
      <PWAInstallPrompt />
    </div>
  );
}
