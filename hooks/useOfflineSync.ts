"use client";

import { useEffect, useState } from "react";
import { db, SyncAction } from "@/lib/db";
import { createVistoria, updateVistoria, addVistoriaComment } from "@/app/(admin)/vistorias/actions";
import { uploadMediaToRustFS } from "@/app/actions/uploadMedia";

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);

      const handleOnline = () => {
        setIsOnline(true);
        processSyncQueue();
      };

      const handleOffline = () => {
        setIsOnline(false);
      };

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      // Processa fila no carregamento inicial se estiver online
      if (navigator.onLine) {
        processSyncQueue();
      }

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  const processSyncQueue = async () => {
    // Evita concorrência de sincronização
    if (isSyncing) return;

    const queue = await db.syncQueue.orderBy("timestamp").toArray();
    if (queue.length === 0) return;

    setIsSyncing(true);
    setSyncError(null);

    console.log(`[Offline Sync] Iniciando sincronização de ${queue.length} ações pendentes...`);

    // Mapeador para converter IDs temporários offline em IDs reais do banco de dados
    const idMap: Record<string, string> = {};

    try {
      for (const action of queue) {
        await processAction(action, idMap);
      }
      console.log("[Offline Sync] Sincronização concluída com sucesso!");
    } catch (err: any) {
      console.error("[Offline Sync] Falha durante a sincronização:", err);
      setSyncError(err.message || "Erro desconhecido na sincronização.");
    } finally {
      setIsSyncing(false);
    }
  };

  const processAction = async (action: SyncAction, idMap: Record<string, string>) => {
    const vistoriaId = idMap[action.vistoriaId] || action.vistoriaId;

    if (action.type === "CREATE_VISTORIA") {
      const res = await createVistoria(action.payload);
      if (res.success && res.data) {
        // Mapeia o ID temporário gerado offline para o ID real gerado pelo Prisma
        idMap[action.vistoriaId] = res.data.id;
        
        // Remove do IndexedDB e reinsere com o ID real
        const localData = await db.vistorias.get(action.vistoriaId);
        if (localData) {
          await db.vistorias.delete(action.vistoriaId);
          await db.vistorias.put({
            ...localData,
            id: res.data.id,
            codigo: res.data.codigo,
            pendingSync: false,
            pendingCreate: false
          });
        }
        await db.syncQueue.delete(action.id!);
      } else {
        throw new Error(res.error || "Falha ao criar vistoria no servidor.");
      }
    } 
    
    else if (action.type === "UPDATE_VISTORIA") {
      const payload = { ...action.payload };
      
      // Se a vistoriaId foi mapeada para um ID definitivo
      const currentVistoriaId = idMap[action.vistoriaId] || action.vistoriaId;

      const res = await updateVistoria(currentVistoriaId, payload);
      if (res.success) {
        // Atualiza estado no IndexedDB para sincronizado
        const localData = await db.vistorias.get(action.vistoriaId);
        if (localData) {
          await db.vistorias.update(action.vistoriaId, { pendingSync: false });
        }
        await db.syncQueue.delete(action.id!);
      } else {
        throw new Error(res.error || "Falha ao atualizar vistoria no servidor.");
      }
    } 
    
    else if (action.type === "ADD_COMMENT") {
      const payload = { ...action.payload };
      const currentVistoriaId = idMap[action.vistoriaId] || action.vistoriaId;

      const uploadedMedia: { url: string; type: "image" | "video" }[] = [];

      // 1. Processar mídias offline se houver
      if (payload.media && Array.isArray(payload.media)) {
        for (const item of payload.media) {
          if (item.url.startsWith("blob:") || item.offlineId) {
            // Busca o arquivo físico no IndexedDB
            const mediaId = item.offlineId || item.url;
            const offlineFile = await db.offlineMedia.get(mediaId);

            if (offlineFile) {
              const fileObj = new File([offlineFile.blob], offlineFile.fileName, {
                type: offlineFile.blob.type
              });

              const formData = new FormData();
              formData.append("file", fileObj);

              // Upload usando Server Action
              const uploadRes = await uploadMediaToRustFS(formData);
              uploadedMedia.push({
                url: uploadRes.url,
                type: offlineFile.type
              });

              // Remove mídia offline processada
              await db.offlineMedia.delete(mediaId);
            }
          } else {
            uploadedMedia.push(item);
          }
        }
      }

      // Substitui as mídias temporárias pelas URLs definitivas do storage
      payload.media = uploadedMedia;

      const res = await addVistoriaComment(currentVistoriaId, payload);
      if (res.success && res.data) {
        // Atualiza a lista local de comentários na vistoria cacheada
        const localData = await db.vistorias.get(action.vistoriaId);
        if (localData) {
          const updatedComments = localData.comentariosVistoria.map((c: any) => {
            // Se for o comentário temporário adicionado offline
            if (c.text === payload.text && c.roomId === payload.roomId && c.id.startsWith("temp-")) {
              return {
                ...c,
                id: res.data.id,
                media: uploadedMedia,
                timestamp: new Date(res.data.createdAt)
              };
            }
            return c;
          });
          await db.vistorias.update(action.vistoriaId, { comentariosVistoria: updatedComments });
        }
        await db.syncQueue.delete(action.id!);
      } else {
        throw new Error(res.error || "Falha ao enviar comentário para o servidor.");
      }
    }
  };

  return {
    isOnline,
    isSyncing,
    syncError,
    triggerSync: processSyncQueue,
  };
}
