"use client";

import { useState, useEffect } from "react";
import EditorServices, { ServiceItem } from "../components/EditorServices";
import EditorMediaItems, { MediaItem } from "../components/EditorMediaItems";
import EditorReviews, { ReviewItem } from "../components/EditorReviews";
import { Briefcase, Image as ImageIcon, MessageSquareQuote, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { getSiteConfig, updateSiteConfig } from "@/app/actions/siteActions";

export default function SiteEditor() {
  const [activeTab, setActiveTab] = useState<"services" | "media" | "reviews">("services");
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadConfig() {
      setLoading(true);
      setErrorMessage(null);
      const res = await getSiteConfig();
      if (res.success && res.data) {
        setServices(res.data.services);
        setMediaItems(res.data.mediaItems);
        setReviews(res.data.reviews);
      } else {
        setErrorMessage(res.error || "Não foi possível carregar os dados do site.");
      }
      setLoading(false);
    }
    loadConfig();
  }, []);

  const handleServicesSave = async (updated: ServiceItem[]) => {
    setServices(updated);
    const res = await updateSiteConfig({ services: updated });
    if (res.success) {
      showSuccessToast();
    } else {
      setErrorMessage(res.error || "Não foi possível salvar os serviços.");
    }
  };

  const handleMediaSave = async (updated: MediaItem[]) => {
    setMediaItems(updated);
    const res = await updateSiteConfig({ mediaItems: updated });
    if (res.success) {
      showSuccessToast();
    } else {
      setErrorMessage(res.error || "Não foi possível salvar as mídias.");
    }
  };

  const handleReviewsSave = async (updated: ReviewItem[]) => {
    setReviews(updated);
    const res = await updateSiteConfig({ reviews: updated });
    if (res.success) {
      showSuccessToast();
    } else {
      setErrorMessage(res.error || "Não foi possível salvar os depoimentos.");
    }
  };

  const showSuccessToast = () => {
    setErrorMessage(null);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
    }, 3000);
  };

  return (
    <div className="space-y-6">
      {/* Toast de notificação de alteração salva */}
      {savedSuccess && (
        <div className="fixed bottom-6 right-6 bg-emerald-700 text-white px-4 py-3 rounded-2xl shadow-xl z-50 flex items-center gap-2 text-xs font-bold animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          <span>Alterações salvas com sucesso!</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Navegação interna do Editor do Site */}
      <div className="flex items-center gap-2 border-b border-zinc-200/80 pb-3">
        <button
          onClick={() => setActiveTab("services")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "services"
              ? "bg-brand-primary/10 text-brand-primary border border-brand-primary/30"
              : "text-zinc-600 hover:bg-zinc-100"
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Serviços Oferecidos</span>
        </button>

        <button
          onClick={() => setActiveTab("media")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "media"
              ? "bg-brand-primary/10 text-brand-primary border border-brand-primary/30"
              : "text-zinc-600 hover:bg-zinc-100"
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>Mídias & Banners</span>
        </button>

        <button
          onClick={() => setActiveTab("reviews")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "reviews"
              ? "bg-brand-primary/10 text-brand-primary border border-brand-primary/30"
              : "text-zinc-600 hover:bg-zinc-100"
          }`}
        >
          <MessageSquareQuote className="w-4 h-4" />
          <span>Depoimentos</span>
        </button>
      </div>

      {/* Conteúdo da Aba Ativa */}
      <div className="bg-zinc-50/50 p-4 sm:p-6 rounded-2xl border border-zinc-200/70">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-zinc-400 gap-2 text-xs font-medium">
            <Loader2 className="w-5 h-5 animate-spin text-brand-primary" />
            <span>Carregando dados do editor...</span>
          </div>
        ) : (
          <>
            {activeTab === "services" && (
              <EditorServices services={services} onSaveServices={handleServicesSave} />
            )}
            {activeTab === "media" && (
              <EditorMediaItems mediaItems={mediaItems} onSaveMediaItems={handleMediaSave} />
            )}
            {activeTab === "reviews" && (
              <EditorReviews reviews={reviews} onSaveReviews={handleReviewsSave} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
