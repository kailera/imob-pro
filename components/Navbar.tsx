"use client";

import { Home, ClipboardCheck, Building, Key, Users, Menu, X, Search, Bell, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";

const navItems = [
  { name: "Dashboard", href: "/admin", icon: Home },
  { name: "Vistorias", href: "/vistorias", icon: ClipboardCheck },
  { name: "Imóveis", href: "/imoveis", icon: Building },
  { name: "Locação", href: "/locacao", icon: Key },
  { name: "Clientes", href: "/clientes", icon: Users },
  { name: "CRM", href: "/crm", icon: LayoutDashboard },
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

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

        {/* Right Side: Search, Notifications, Profile, Mobile Menu Toggle */}
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Search Bar - Visual Only (Desktop) */}
          <div className="relative w-48 lg:w-64 hidden sm:block">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-[#280003]/40" />
            </div>
            <input
              type="text"
              placeholder="Buscar..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#EEEEF3] border-none rounded-lg text-sm text-[#280003] placeholder-[#280003]/50 focus:outline-none focus:ring-2 focus:ring-[#004777]/20 transition-all"
            />
          </div>

          {/* Notification Bell */}
          <button className="p-2 text-[#280003]/60 hover:text-[#004777] hover:bg-[#EEEEF3] rounded-lg transition-colors relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#004777] rounded-full"></span>
          </button>

          {/* User Profile */}
          <div className="flex items-center gap-3 pl-4 border-l border-[#EEEEF3]">
            <div className="flex flex-col items-end hidden sm:flex">
              <span className="text-sm font-medium text-[#280003]">Imob Pro Admin</span>
              <span className="text-xs text-[#280003]/60">Administrador</span>
            </div>
            <div className="w-9 h-9 rounded-full bg-[#004777]/10 flex items-center justify-center text-[#004777] font-bold text-sm">
              IP
            </div>
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

            {/* Visual Search input for Mobile */}
            <div className="pt-4 border-t border-[#EEEEF3] relative mt-2 sm:hidden">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none pt-4">
                <Search className="w-4 h-4 text-[#280003]/40" />
              </div>
              <input
                type="text"
                placeholder="Buscar..."
                className="w-full pl-9 pr-3 py-2 bg-[#EEEEF3] border-none rounded-lg text-sm text-[#280003] placeholder-[#280003]/50 focus:outline-none"
              />
            </div>
          </div>
        </>
      )}
    </nav>
  );
}
