"use client";

import { Home, ClipboardCheck, Building, Key, Users, Menu, X, Bell, LayoutDashboard, Scale, Coins, Settings, Download, Wrench } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { UserButton, OrganizationSwitcher, SignInButton, SignUpButton, Show } from "@clerk/nextjs";
import { usePWA } from "@/components/shared/PWAProvider";

const navItems = [
  { name: "Dashboard", href: "/admin", icon: Home },
  { name: "Vistorias", href: "/vistorias", icon: ClipboardCheck },
  { name: "Imóveis", href: "/imoveis", icon: Building },
  { name: "Locação", href: "/locacao", icon: Key },
  { name: "Manutenções", href: "/manutencoes", icon: Wrench },
  { name: "Clientes", href: "/clientes", icon: Users },
  { name: "CRM", href: "/crm", icon: LayoutDashboard },
  { name: "Jurídico", href: "/juridico", icon: Scale },
  { name: "Financeiro", href: "/financeiro", icon: Coins },
  { name: "Configurações", href: "/configuracoes", icon: Settings },
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { isStandalone, isMobile, isSecureConnection, promptInstall, deferredPrompt, isIOS } = usePWA();

  return (
    <nav className="fixed top-0 left-0 right-0 h-20 bg-[#FFFFFF] shadow-sm z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center gap-10 justify-between">

        {/* Left Side: Brand and Desktop Nav */}
        <div className="flex items-center gap-10 h-full">
          <Link href="/admin" className="flex-shrink-0">
            <h1 className="text-xl font-bold text-[#004777]">Imob Pro</h1>
          </Link>

          {/* Desktop Nav Items */}
          <div className="hidden md:flex items-center space-x-6 h-full">
            {navItems.map((item) => {
              const isActive = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-2 h-20 border-b-2 text-sm font-medium transition-all duration-200 ${isActive
                    ? "border-[#004777] text-[#004777]"
                    : "border-transparent text-[#280003]/70 hover:text-[#004777] hover:border-[#EEEEF3]"
                    }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right Side: Notifications, Profile, Mobile Menu Toggle */}
        <div className="flex items-center gap-4 sm:gap-6">

          {/* Notification Bell */}
          <button className="p-2 text-[#280003]/60 hover:text-[#004777] hover:bg-[#EEEEF3] rounded-lg transition-colors relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#004777] rounded-full"></span>
          </button>

          {/* User Profile & Organization switcher */}
          <div className="flex items-center gap-4 pl-4 border-l border-[#EEEEF3]">
            <Show when="signed-in">
              <div className="hidden sm:block">
                <OrganizationSwitcher
                  afterCreateOrganizationUrl="/admin"
                  appearance={{
                    elements: {
                      rootBox: "text-xs font-semibold text-gray-600"
                    }
                  }}
                />
              </div>
              <UserButton />
            </Show>
            <Show when="signed-out">
              <div className="flex gap-2">
                <SignInButton mode="modal">
                  <button className="text-xs bg-[#004777] text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-[#004777]/90 transition-all cursor-pointer">
                    Entrar
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="text-xs bg-[#708D81] text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-[#708D81]/90 transition-all cursor-pointer">
                    Cadastrar
                  </button>
                </SignUpButton>
              </div>
            </Show>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 text-[#280003]/80 hover:text-[#004777] rounded-lg hover:bg-[#EEEEF3] transition-colors"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-[#280003]/25 z-40 md:hidden"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-20 left-0 right-0 bg-[#FFFFFF] shadow-lg border-t border-[#EEEEF3] py-4 px-6 space-y-2 z-50 md:hidden flex flex-col">
            {navItems.map((item) => {
              const isActive = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-all ${isActive
                    ? "bg-[#004777]/10 text-[#004777] border-l-4 border-[#004777]"
                    : "text-[#280003]/70 hover:bg-[#EEEEF3] hover:text-[#004777] border-l-4 border-transparent"
                    }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}

            {isMobile && isSecureConnection && !isStandalone && (isIOS || deferredPrompt) && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  if (isIOS) {
                    alert("Para instalar o aplicativo no seu iPhone:\n\n1. Toque no botão de compartilhar (ícone com um quadrado e uma seta para cima na barra inferior do Safari).\n2. Selecione a opção 'Adicionar à Tela de Início'.");
                  } else {
                    promptInstall();
                  }
                }}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-base font-semibold text-[#004777] bg-[#004777]/5 border-l-4 border-[#004777] hover:bg-[#004777]/10 transition-all cursor-pointer mt-2"
              >
                <Download className="w-5 h-5" />
                <span>Instalar Aplicativo</span>
              </button>
            )}

          </div>
        </>
      )}
    </nav>
  );
}
