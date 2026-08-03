"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import logoImg from "./logoscatpublic.png";

export function PublicNavbar() {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { name: "Comprar", href: "/busca?operation=venda" },
    { name: "Alugar", href: "/busca?operation=locacao" },
    { name: "Loteamentos", href: "/loteamentos" },
    { name: "Sobre Nós", href: "/#sobre" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 h-20 bg-brand-primary border-b border-white/10 shadow-sm z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group py-1">
          <Image
            src={logoImg}
            alt="Scatolin Imóveis"
            className="h-16 w-auto object-contain transition-transform group-hover:scale-105"
            priority
          />
        </Link>

        {/* Center Links (Desktop) */}
        <div className="hidden md:flex items-center gap-8">
          {menuItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="text-base font-medium text-[#F0EBDA] hover:text-white transition-colors py-2 relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-[#F0EBDA] after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:origin-left"
            >
              {item.name}
            </Link>
          ))}
        </div>

        {/* Hamburger (Mobile) */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden p-2 text-[#F0EBDA] hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-20 left-0 right-0 bg-brand-primary shadow-xl border-t border-white/10 p-6 flex flex-col gap-4 z-50 md:hidden transition-all duration-300">
            {menuItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="text-lg font-medium text-[#F0EBDA] hover:text-white py-2 border-b border-white/10"
              >
                {item.name}
              </Link>
            ))}
          </div>
        </>
      )}
    </nav>
  );
}


