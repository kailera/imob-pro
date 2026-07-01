"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Edit3, Map, Grid2X2 } from "lucide-react";
import { RoomBuilderForm } from "@/components/ficha-vistoria/RoomBuilderForm";
import { FloorPlanVisualizer, Room } from "@/components/ficha-vistoria/FloorPlanVisualizer";
import { DetailSections } from "@/components/ficha-vistoria/DetailSections";
import { InspectionEditorPanel } from "@/components/ficha-vistoria/InspectionEditorPanel";
import { CommentData } from "@/components/ficha-vistoria/CommentsTimeline";

export default function FichaVistoriaPage() {
  const router = useRouter();
  const params = useParams();
  const vistoriaId = params?.id || "VIS-2026-104";

  const roomsStorageKey = `vistoria_rooms_${vistoriaId}`;
  const commentsStorageKey = `vistoria_comments_${vistoriaId}`;
  const reportDescStorageKey = `vistoria_report_desc_${vistoriaId}`;
  const reportObsStorageKey = `vistoria_report_obs_${vistoriaId}`;

  const defaultReportDesc = `Imóvel vistoriado em perfeitas condições de habitação. As paredes encontram-se com pintura nova (tinta Látex Suvinil branca). O piso laminado da sala e dos quartos não apresenta riscos ou desgastes aparentes. Todas as portas e janelas fecham corretamente.\n\nNo banheiro, o blindex possui marcas leves de uso e o chuveiro elétrico (Lorenzetti 220v) está funcionando. Na cozinha, os armários embutidos possuem dobradiças em bom estado. A pia não apresenta vazamentos no sifão.`;
  const defaultReportObs = `Foi notada uma leve marcação na parede próxima à janela do segundo quarto, proveniente de um antigo móvel, sem comprometer a estrutura.`;

  const [rooms, setRooms] = useState<Room[]>([]);
  const [comments, setComments] = useState<CommentData[]>([]);
  const [reportDescription, setReportDescription] = useState("");
  const [reportObservation, setReportObservation] = useState("");
  const [isClient, setIsClient] = useState(false);
  const [viewMode, setViewMode] = useState<'form' | 'planta'>('planta');

  // Load from localStorage on mount
  useEffect(() => {
    setIsClient(true);
    const savedRooms = localStorage.getItem(roomsStorageKey);
    if (savedRooms) {
      try {
        setRooms(JSON.parse(savedRooms));
      } catch (e) {
        console.error("Erro ao carregar cômodos:", e);
      }
    } else {
      setRooms([
        { id: '1', type: 'Sala', name: 'Sala de Estar' },
        { id: '2', type: 'Quarto', name: 'Quarto Casal' },
        { id: '3', type: 'Banheiro', name: 'Suíte' },
        { id: '4', type: 'Cozinha', name: 'Cozinha' },
        { id: '5', type: 'Quarto', name: 'Quarto Solteiro' },
        { id: '6', type: 'Corredor', name: 'Corredor' },
        { id: '7', type: 'Varanda', name: 'Sacada' },
      ]);
    }

    const savedComments = localStorage.getItem(commentsStorageKey);
    if (savedComments) {
      try {
        const parsed = JSON.parse(savedComments);
        const commentsWithDates = parsed.map((c: any) => ({
          ...c,
          timestamp: new Date(c.timestamp)
        }));
        setComments(commentsWithDates);
      } catch (e) {
        console.error("Erro ao carregar comentários:", e);
      }
    } else {
      setComments([
        {
          id: '1',
          roomId: 'geral',
          roomName: 'Comentário Geral',
          text: 'Imóvel apresenta boas condições de pintura, porém necessita limpeza pesada antes da entrega das chaves.',
          status: 'Atenção',
          timestamp: new Date()
        }
      ]);
    }

    const savedDesc = localStorage.getItem(reportDescStorageKey);
    if (savedDesc !== null) {
      setReportDescription(savedDesc);
    } else {
      setReportDescription(defaultReportDesc);
    }

    const savedObs = localStorage.getItem(reportObsStorageKey);
    if (savedObs !== null) {
      setReportObservation(savedObs);
    } else {
      setReportObservation(defaultReportObs);
    }
  }, [roomsStorageKey, commentsStorageKey, reportDescStorageKey, reportObsStorageKey]);

  // Save to localStorage when state changes
  useEffect(() => {
    if (isClient) {
      localStorage.setItem(roomsStorageKey, JSON.stringify(rooms));
    }
  }, [rooms, isClient, roomsStorageKey]);

  useEffect(() => {
    if (isClient) {
      localStorage.setItem(commentsStorageKey, JSON.stringify(comments));
    }
  }, [comments, isClient, commentsStorageKey]);

  useEffect(() => {
    if (isClient) {
      localStorage.setItem(reportDescStorageKey, reportDescription);
    }
  }, [reportDescription, isClient, reportDescStorageKey]);

  useEffect(() => {
    if (isClient) {
      localStorage.setItem(reportObsStorageKey, reportObservation);
    }
  }, [reportObservation, isClient, reportObsStorageKey]);

  const handleAddRoom = (room: Room) => {
    setRooms(prev => [...prev, room]);
  };

  const handleRemoveRoom = (roomId: string) => {
    setRooms(prev => prev.filter(r => r.id !== roomId));
  };

  const handleAddComment = (
    roomId: string, 
    roomName: string, 
    text: string, 
    status: 'Aprovado' | 'Atenção',
    media?: { url: string; type: 'image' | 'video' }[]
  ) => {
    const newComment: CommentData = {
      id: Math.random().toString(36).substring(7),
      roomId,
      roomName,
      text,
      status,
      timestamp: new Date(),
      media
    };
    setComments(prev => [newComment, ...prev]);
  };

  // Prevent SSR mismatch by displaying a placeholder or basic layout while client loads
  if (!isClient) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#004777]"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full max-w-[1600px] bg-white mx-auto gap-6 pb-16 px-2 sm:px-0">

      {/* Top Header / Breadcrumb */}
      <header className="flex items-center justify-between bg-white p-4 sm:p-6 rounded-2xl border border-[#EEEEF3] shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/vistorias')}
            className="p-2 hover:bg-[#EEEEF3] rounded-lg transition-colors text-gray-500 hover:text-[#004777] print:hidden"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#280003] tracking-tight">
              Ficha de Vistoria <span className="text-[#004777]">#{vistoriaId}</span>
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Visualize o mapa do imóvel e todos os detalhes técnicos.
            </p>
          </div>
        </div>

        <button
          onClick={() => window.print()}
          className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-[#004777] text-white rounded-lg text-sm font-semibold hover:bg-[#00365a] transition-all shadow-sm print:hidden"
        >
          Gerar PDF Oficial
        </button>
      </header>

      {/* Split Screen Layout */}
      <div className="flex flex-col lg:flex-row print:flex-col gap-8 items-start">

        {/* Left Side: Visualizer, Composição & Details (Scrollable) */}
        <div className="w-full lg:w-[60%] print:w-full flex flex-col gap-10">

          <div className="flex flex-col gap-4">
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
                />
              </div>
              <div className={viewMode === 'planta' ? 'block' : 'hidden print:block'}>
                <FloorPlanVisualizer rooms={rooms} />
              </div>
            </div>
          </div>

          <DetailSections 
            comments={comments} 
            reportDescription={reportDescription}
            reportObservation={reportObservation}
          />
        </div>

        {/* Right Side: Editor Panel (Sticky) */}
        <div className="w-full lg:w-[40%] flex flex-col gap-6 lg:sticky lg:top-24 print:hidden">
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
          />
        </div>

      </div>
    </div>
  );
}
