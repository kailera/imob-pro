"use client";

import { Home, ClipboardCheck, Building, Key, Menu, X, Bell, LayoutDashboard, Scale, Coins, Settings, Download, Wrench, ChevronDown, Archive } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { UserButton, OrganizationSwitcher, SignInButton, SignUpButton, Show } from "@clerk/nextjs";
import { usePWA } from "@/components/shared/PWAProvider";

const navItems = [
  { name: "Dashboard", href: "/admin", icon: Home },
  { name: "Vistorias", href: "/vistorias", icon: ClipboardCheck },
  {
    name: "Locação",
    href: "/locacao",
    icon: Key,
    children: [
      { name: "Residenciais", href: "/residenciais", icon: Building },
      { name: "Inativos", href: "/locacao/inativos", icon: Archive },
    ],
  },
  { name: "Manutenções", href: "/manutencoes", icon: Wrench },
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
    <nav className="fixed top-0 left-0 right-0 h-20 bg-[#FFFFFF] shadow-sm z-50 transition-all duration-300 w-full max-w-full overflow-x-clip">
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 w-full">

        {/* Left Side: Brand and Desktop Nav */}
        <div className="flex items-center gap-4 xl:gap-6 h-full min-w-0">
          <Link href="/admin" className="flex-shrink-0">
            <h1 className="text-xl font-bold text-[#004777]">Imob Pro</h1>
          </Link>

          {/* Desktop Nav Items - shown on xl screens to fit 10 items without overflow */}
          <div className="hidden xl:flex items-center space-x-1 2xl:space-x-4 h-full min-w-0">
            {navItems.map((item) => {
              const isActive = item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href) || item.children?.some(child => pathname.startsWith(child.href));
              if (item.children) {
                return (
                  <div key={item.name} className="group relative flex h-20 items-center">
                    <Link
                      href={item.href}
                      className={`flex h-20 items-center gap-1.5 whitespace-nowrap border-b-2 px-1.5 text-xs font-medium transition-all duration-200 2xl:px-2.5 2xl:text-sm ${isActive
                        ? "border-[#004777] text-[#004777]"
                        : "border-transparent text-[#280003]/70 hover:border-[#EEEEF3] hover:text-[#004777]"
                        }`}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.name}</span>
                      <ChevronDown className="h-3.5 w-3.5 transition-transform group-hover:rotate-180 group-focus-within:rotate-180" />
                    </Link>
                    <div className="invisible absolute left-0 top-full z-[60] min-w-56 translate-y-1 rounded-b-2xl border border-zinc-100 bg-white p-2 opacity-0 shadow-xl transition-all group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
                      {item.children.map(child => {
                        const childActive = pathname.startsWith(child.href);
                        return (
                          <Link
                            key={child.name}
                            href={child.href}
                            className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${childActive
                              ? "bg-[#004777]/10 text-[#004777]"
                              : "text-[#280003]/70 hover:bg-[#EEEEF3] hover:text-[#004777]"
                              }`}
                          >
                            <child.icon className="h-4 w-4 shrink-0" />
                            <span>{child.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              }
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-1.5 2xl:px-2.5 h-20 border-b-2 text-xs 2xl:text-sm font-medium whitespace-nowrap transition-all duration-200 ${isActive
                    ? "border-[#004777] text-[#004777]"
                    : "border-transparent text-[#280003]/70 hover:text-[#004777] hover:border-[#EEEEF3]"
                    }`}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right Side: Notifications, Profile, Mobile Menu Toggle */}
        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">

          {/* Notification Bell */}
          <button className="p-2 text-[#280003]/60 hover:text-[#004777] hover:bg-[#EEEEF3] rounded-lg transition-colors relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#004777] rounded-full"></span>
          </button>

          {/* User Profile & Organization switcher */}
          <div className="flex items-center gap-2 sm:gap-4 pl-2 sm:pl-4 border-l border-[#EEEEF3]">
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

          {/* Mobile/Tablet Menu Button (shown on < xl screens) */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="xl:hidden p-2 text-[#280003]/80 hover:text-[#004777] rounded-lg hover:bg-[#EEEEF3] transition-colors"
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
            className="fixed inset-0 bg-[#280003]/25 z-40 xl:hidden"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed top-20 left-0 right-0 bg-[#FFFFFF] shadow-lg border-t border-[#EEEEF3] p-4 sm:p-6 space-y-2 z-50 xl:hidden flex flex-col max-h-[calc(100vh-5rem)] overflow-y-auto">
            {navItems.map((item) => {
              const isActive = item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href) || item.children?.some(child => pathname.startsWith(child.href));
              return (
                <div key={item.name}>
                  <Link
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
                  {item.children && (
                    <div className="ml-6 mt-1 space-y-1 border-l border-[#004777]/15 pl-3">
                      {item.children.map(child => {
                        const childActive = pathname.startsWith(child.href);
                        return (
                          <Link
                            key={child.name}
                            href={child.href}
                            onClick={() => setIsOpen(false)}
                            className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${childActive
                              ? "bg-[#004777]/10 text-[#004777]"
                              : "text-[#280003]/65 hover:bg-[#EEEEF3] hover:text-[#004777]"
                              }`}
                          >
                            <child.icon className="h-4 w-4" />
                            <span>{child.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
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
