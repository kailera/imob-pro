"use client";

import { useState, useEffect } from "react";
import { getLoteamentoLots, updateLoteamentoMapa } from "@/app/actions/imoveisActions";
import { uploadMediaToRustFS } from "@/app/actions/uploadMedia";
import { Map, Loader2, AlertCircle, RefreshCw, Upload, Image as ImageIcon, Trash2 } from "lucide-react";

interface EditorLoteamentoProps {
  onShowToast?: (message: string) => void;
}

export default function EditorLoteamento({ onShowToast }: EditorLoteamentoProps) {
  const [loteamentoId, setLoteamentoId] = useState<string>("");
  const [mapaUrl, setMapaUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadLoteamento() {
    setLoading(true);
    setError(null);
    try {
      const res = await getLoteamentoLots("village-parra");
      if (res.success) {
        setLoteamentoId(res.loteamentoId || "");
        setMapaUrl(res.mapaUrl || null);
      } else {
        setError(res.error || "Não foi possível carregar as informações do loteamento.");
      }
    } catch (err: any) {
      setError(err.message || "Erro de conexão ao carregar loteamento.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLoteamento();
  }, []);

  const handleMapUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !loteamentoId) return;
    setUploading(true);
    setError(null);
    try {
      const data = new FormData();
      data.append("file", file);
      const uploadRes = await uploadMediaToRustFS(data);
      if (uploadRes.url) {
        const updateRes = await updateLoteamentoMapa(loteamentoId, uploadRes.url);
        if (updateRes.success) {
          setMapaUrl(uploadRes.url);
          if (onShowToast) onShowToast("Mapa do loteamento atualizado com sucesso!");
        } else {
          setError(updateRes.error || "Erro ao salvar a URL do mapa.");
        }
      } else {
        setError("Não foi possível obter a URL da imagem enviada.");
      }
    } catch (err: any) {
      console.error("Erro no upload do mapa:", err);
      setError(err.message || "Erro ao fazer upload da imagem.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveMap = async () => {
    if (!loteamentoId) return;
    setUploading(true);
    setError(null);
    try {
      const updateRes = await updateLoteamentoMapa(loteamentoId, null);
      if (updateRes.success) {
        setMapaUrl(null);
        if (onShowToast) onShowToast("Mapa removido com sucesso!");
      } else {
        setError(updateRes.error || "Erro ao remover o mapa.");
      }
    } catch (err: any) {
      setError(err.message || "Erro ao remover o mapa.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-400 gap-2 text-xs font-semibold">
        <Loader2 className="w-6 h-6 animate-spin text-brand-primary" />
        <span>Carregando as configurações do loteamento...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-100 rounded-2xl p-6 flex flex-col items-center gap-4 text-center max-w-md mx-auto my-12">
        <AlertCircle className="w-10 h-10 text-rose-500" />
        <div>
          <h4 className="font-extrabold text-sm text-zinc-800">Falha no Gerenciador</h4>
          <p className="text-xs text-zinc-600 mt-1">{error}</p>
        </div>
        <button
          onClick={loadLoteamento}
          className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl hover:bg-rose-700 transition-colors shadow-sm cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Tentar Novamente</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-100 pb-4 gap-4">
        <div>
          <h3 className="text-lg font-bold text-zinc-800 flex items-center gap-2">
            <Map className="w-5 h-5 text-brand-primary" />
            <span>Gerenciar Loteamento: Village Parra</span>
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Faça o upload do mapa de disponibilidade atualizado para exibição pública no site.
          </p>
        </div>
      </div>

      {/* Map image uploader */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-sm space-y-4">
        <h4 className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Imagem do Mapa de Disponibilidade</h4>
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          {mapaUrl ? (
            <div className="relative w-full md:w-80 aspect-video rounded-xl overflow-hidden bg-zinc-100 border border-zinc-200 shadow-sm group">
              <img src={mapaUrl} alt="Mapa do Loteamento" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <a href={mapaUrl} target="_blank" rel="noopener noreferrer" className="text-white text-xs font-bold underline bg-zinc-900/60 px-3 py-1.5 rounded-lg">Visualizar Original</a>
              </div>
            </div>
          ) : (
            <div className="w-full md:w-80 aspect-video rounded-xl bg-zinc-50 border-2 border-dashed border-zinc-300 flex flex-col items-center justify-center text-zinc-400 gap-1.5 p-4">
              <ImageIcon className="w-8 h-8 text-zinc-300" />
              <span className="text-[10px] font-semibold text-center leading-relaxed">Nenhuma imagem de mapa cadastrada.</span>
            </div>
          )}

          <div className="flex-1 space-y-3">
            <p className="text-xs text-zinc-500 leading-relaxed max-w-md">
              Faça o upload de uma imagem do mapa (PNG, JPG) com as demarcações atualizadas dos lotes. Esta imagem será exibida diretamente para os clientes no site.
            </p>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 px-4 py-2 bg-brand-primary text-white text-xs font-bold rounded-xl hover:bg-brand-primary/95 transition-colors shadow-sm cursor-pointer">
                {uploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>Fazer Upload do Mapa</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleMapUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
              
              {mapaUrl && (
                <button
                  onClick={handleRemoveMap}
                  disabled={uploading}
                  className="flex items-center gap-1.5 px-4 py-2 border border-zinc-200 text-rose-600 text-xs font-bold rounded-xl hover:bg-rose-50 hover:border-rose-200 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remover Mapa</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
