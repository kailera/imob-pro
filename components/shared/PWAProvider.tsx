"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface PWAContextType {
  deferredPrompt: any;
  isStandalone: boolean;
  isIOS: boolean;
  isMobile: boolean;
  isSecureConnection: boolean;
  promptInstall: () => Promise<boolean>;
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isSecureConnection, setIsSecureConnection] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Detecta conexão segura (HTTPS ou local)
    const secure = 
      window.location.protocol === "https:" || 
      window.location.hostname === "localhost" || 
      window.location.hostname === "127.0.0.1";
    setIsSecureConnection(secure);

    // 2. Detecta se está rodando no modo standalone (instalado)
    const standalone = 
      window.matchMedia("(display-mode: standalone)").matches || 
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // 3. Detecta se é iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(ios);

    // 4. Detecta se é mobile
    const mobile = /mobi|android|iphone|ipad|ipod/.test(userAgent);
    setIsMobile(mobile);

    // 5. Captura o prompt de instalação do PWA
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      console.log("[PWA] Evento beforeinstallprompt capturado globalmente.");
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // 6. Registro do Service Worker
    if ("serviceWorker" in navigator) {
      const handleLoad = () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("[PWA] Service Worker registrado com sucesso no escopo:", registration.scope);
          })
          .catch((error) => {
            console.error("[PWA] Falha ao registrar o Service Worker:", error);
          });
      };

      if (document.readyState === "complete") {
        handleLoad();
      } else {
        window.addEventListener("load", handleLoad);
        return () => {
          window.removeEventListener("load", handleLoad);
          window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        };
      }
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const promptInstall = async (): Promise<boolean> => {
    if (!deferredPrompt) {
      console.warn("[PWA] O prompt de instalação diferido não está disponível.");
      return false;
    }

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`[PWA] Escolha de instalação do usuário: ${outcome}`);
      
      if (outcome === "accepted") {
        setDeferredPrompt(null);
        return true;
      }
    } catch (error) {
      console.error("[PWA] Erro ao invocar o prompt de instalação:", error);
    }
    return false;
  };

  return (
    <PWAContext.Provider
      value={{
        deferredPrompt,
        isStandalone,
        isIOS,
        isMobile,
        isSecureConnection,
        promptInstall,
      }}
    >
      {children}
    </PWAContext.Provider>
  );
}

export function usePWA() {
  const context = useContext(PWAContext);
  if (context === undefined) {
    // Retorna valores padrão seguros caso seja chamado no SSR ou fora do Provider
    return {
      deferredPrompt: null,
      isStandalone: false,
      isIOS: false,
      isMobile: false,
      isSecureConnection: false,
      promptInstall: async () => false,
    };
  }
  return context;
}
