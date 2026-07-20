"use client";

import React, { useEffect, useState } from "react";
import { usePWA } from "./PWAProvider";
import { Download, X, Share, PlusSquare, Smartphone } from "lucide-react";

export default function PWAInstallPrompt() {
  const { isStandalone, isIOS, isMobile, isSecureConnection, promptInstall, deferredPrompt } = usePWA();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Não exibe se já estiver rodando como standalone (app instalado)
    if (isStandalone) return;

    // 2. Não exibe se não for dispositivo móvel
    if (!isMobile) return;

    // 3. Não exibe se não for conexão segura (HTTPS ou localhost)
    if (!isSecureConnection) return;

    // 4. Verifica se o usuário descartou o banner recentemente (últimos 7 dias)
    const dismissedTime = localStorage.getItem("pwa_install_prompt_dismissed");
    if (dismissedTime) {
      const parsedTime = parseInt(dismissedTime, 10);
      const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - parsedTime < sevenDaysInMs) {
        return;
      }
    }

    // 5. Para Android/Chrome, só mostra se o evento de instalação nativa estiver disponível
    if (!isIOS && !deferredPrompt) {
      return;
    }

    // Adiciona um pequeno atraso de 1.5s antes de exibir o prompt para suavidade na UI
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, [isStandalone, isMobile, isSecureConnection, isIOS, deferredPrompt]);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem("pwa_install_prompt_dismissed", Date.now().toString());
  };

  const handleInstallClick = async () => {
    const installed = await promptInstall();
    if (installed) {
      setIsVisible(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 md:bottom-6 md:right-6 md:left-auto md:w-96 z-[100] animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="bg-white border border-[#EEEEF3] rounded-2xl shadow-xl p-4 flex flex-col gap-3 relative overflow-hidden">
        {/* Barra de destaque superior com a cor da marca */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#004777]" />

        {/* Botão de Fechar */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg cursor-pointer"
          aria-label="Fechar aviso"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Info Cabeçalho */}
        <div className="flex items-center gap-3 pr-6 mt-1">
          <div className="p-2 bg-[#004777]/10 rounded-xl text-[#004777] flex-shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#280003]">Imob Pro no seu Celular</h4>
            <p className="text-[11px] text-gray-500">
              Instale o aplicativo para realizar vistorias offline diretamente em campo.
            </p>
          </div>
        </div>

        {/* Corpo específico para iOS */}
        {isIOS ? (
          <div className="flex flex-col gap-2.5 bg-slate-50 border border-slate-100 p-3 rounded-xl text-xs text-gray-600 leading-relaxed mt-1">
            <p className="font-semibold text-[#004777] mb-1">Como instalar no iPhone:</p>
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 bg-[#004777]/10 text-[#004777] rounded-full text-[10px] font-bold">1</span>
              <span>Toque no botão nativo de <strong>Compartilhar</strong> <Share className="w-3.5 h-3.5 inline mx-0.5 text-gray-500" />.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 bg-[#004777]/10 text-[#004777] rounded-full text-[10px] font-bold">2</span>
              <span>Selecione a opção <strong>"Adicionar à Tela de Início"</strong> <PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-gray-500" />.</span>
            </div>
          </div>
        ) : (
          /* Corpo específico para Android */
          <div className="flex flex-col gap-2 mt-1">
            <button
              onClick={handleInstallClick}
              className="w-full py-2.5 bg-[#004777] text-white font-semibold rounded-xl text-xs hover:bg-[#00365a] transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Instalar Aplicativo</span>
            </button>
            <p className="text-[10px] text-center text-gray-400">
              O aplicativo de vistorias será adicionado à sua tela inicial.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
